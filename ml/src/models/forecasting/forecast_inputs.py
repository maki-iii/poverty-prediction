"""Fit indicators on actual, interpolated, and retained forecast history.

Each run forecasts exactly three years after the latest actual/interpolated year.
Stored forecast inputs remain forecasts; they are never copied into actuals.
"""

from src.pipeline.operations import checkpoint
from src.pipeline.indicator_basis import INDICATOR_BASIS
import uuid
import warnings
from pathlib import Path

import pandas as pd
import numpy as np
import yaml
from statsmodels.tsa.arima.model import ARIMA

from src.preprocess.load_clean import get_forecast_input_data
from src.pipeline.year_selection import FORECAST_HORIZON
from src.database.repository.forecasts_repo import insert_forecasts

PROJECT_ROOT = Path(__file__).resolve().parents[3]  # ml/src/models/forecasting/forecast_inputs.py -> ml/

with open(PROJECT_ROOT / "configs" / "config.yaml", "r") as f:
    CONFIG = yaml.safe_load(f)

REGION = CONFIG["region"]
FEATURE_COLUMNS = CONFIG["feature_columns"]
HORIZON = FORECAST_HORIZON
AUTO_ORDER = CONFIG["arima"]["auto_order_selection"]
FALLBACK_ORDER = tuple(CONFIG["arima"]["fallback_order"])


def annual_series(series: pd.Series) -> pd.Series:
    """Preserve elapsed years; absent observations stay missing, never compressed."""
    result = series.astype(float).copy()
    if isinstance(result.index, pd.PeriodIndex):
        result.index = result.index.asfreq("Y")
    else:
        result.index = pd.PeriodIndex([str(int(year)) for year in result.index], freq="Y")
    if result.index.has_duplicates:
        raise ValueError("Duplicate indicator years are not allowed.")
    result = result.sort_index()
    return result.reindex(pd.period_range(result.index.min(), result.index.max(), freq="Y"))


def fit_and_forecast(series: pd.Series, horizon: int) -> tuple[list, str]:
    """
    Fits an ARIMA model to a single indicator's time series and forecasts
    `horizon` steps ahead.

    Returns (forecast_values, order_used_as_string).
    """
    if horizon < 1:
        raise ValueError("Forecast horizon must be positive.")
    series = annual_series(series)
    observed = series.dropna()
    if len(observed) < 3:
        raise ValueError("At least three observed years are required for ARIMA.")

    def forecast_candidate(history, steps, order, trend):
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            checkpoint()
            fitted = ARIMA(history, order=order, trend=trend).fit()
            values = np.asarray(fitted.forecast(steps=steps), dtype=float)
        if not np.isfinite(values).all():
            raise ValueError("ARIMA returned non-finite forecasts.")
        return values

    # Select simple ARIMA specifications by past-only indicator backtests.
    # Drift is essential for trending income; unnecessary AR/MA parameters
    # are unstable with only a handful of survey observations.
    candidates = [((0, 1, 0), "n"), ((0, 1, 0), "t"),
                  ((1, 1, 0), "n"), ((0, 1, 1), "n"),
                  ((0, 0, 0), "c")]
    if not AUTO_ORDER:
        candidates = [(FALLBACK_ORDER, "n")]
    scored = []
    for order, trend in candidates:
        errors = []
        for index in range(max(3, len(observed) - 3), len(observed)):
            origin = observed.index[index - 1]
            target = observed.index[index]
            steps = target.ordinal - origin.ordinal
            try:
                value = forecast_candidate(series.loc[:origin], steps, order, trend)[-1]
                errors.append((float(observed.iloc[index]) - value) ** 2)
            except Exception:
                errors = []
                break
        if errors:
            scored.append((float(np.mean(errors)), order, trend))
    ranked = [(order, trend) for _, order, trend in sorted(scored, key=lambda row: row[0])]
    if not ranked:
        ranked = candidates
    for order, trend in ranked:
        try:
            values = forecast_candidate(series, horizon, order, trend)
            return values.tolist(), f"{order};trend={trend}"
        except Exception:
            continue
    raise ValueError("No ARIMA specification could produce finite forecasts.")


def forecast_all_indicators() -> pd.DataFrame:
    """
    Runs ARIMA forecasting for the configured indicators.

    Returns a DataFrame with one row per forecasted year, all indicator
    columns, plus arima_order and model_run_id metadata.
    """
    X, years = get_forecast_input_data(region=REGION)
    X = X.copy()
    X.index = years.values

    last_year = int(years.max())
    forecast_years = [last_year + i for i in range(1, HORIZON + 1)]
    model_run_id = f"arima_{pd.Timestamp.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}"

    results = {year: {"region": REGION, "year": year, "model_run_id": model_run_id,
                      "indicator_basis": INDICATOR_BASIS} for year in forecast_years}
    orders_used = {}

    for col in FEATURE_COLUMNS:
        series = X[col]
        forecast_values, order_str = fit_and_forecast(series, HORIZON)
        orders_used[col] = order_str

        for year, value in zip(forecast_years, forecast_values):
            results[year][col] = round(float(value), 2)

        print(f"[forecast_inputs] {col}: order={order_str} -> "
              f"{[round(v, 2) for v in forecast_values]}")

    # The legacy VARCHAR(20) cannot hold four specifications. Never store a
    # truncated feature name as if it were an ARIMA order.
    for year in forecast_years:
        results[year]["arima_order"] = "per-indicator"  # per-indicator details are printed above

    return pd.DataFrame(list(results.values())), model_run_id


def run():
    df, model_run_id = forecast_all_indicators()
    records = df.to_dict(orient="records")
    inserted = insert_forecasts(records)
    print(f"\n[forecast_inputs] Inserted {inserted} forecast rows "
          f"(model_run_id={model_run_id}) for years: {df['year'].tolist()}")


if __name__ == "__main__":
    run()
