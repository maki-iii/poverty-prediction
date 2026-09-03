"""
Fits one ARIMA model per socioeconomic indicator (using actuals from
1997-2023), forecasts each indicator forward by the configured horizon
(default 3 years: 2024, 2025, 2026), and writes the results into the
`forecasts` table.

Usage (from the ml/ folder):
    python -m src.models.forecasting.forecast_inputs
"""

import uuid
import warnings
from pathlib import Path

import pandas as pd
import yaml
from statsmodels.tsa.arima.model import ARIMA

try:
    from pmdarima import auto_arima
    PMDARIMA_AVAILABLE = True
except ImportError:
    PMDARIMA_AVAILABLE = False

from src.preprocess.load_clean import get_forecast_input_data
from src.database.repository.forecasts_repo import insert_forecasts

PROJECT_ROOT = Path(__file__).resolve().parents[3]  # ml/src/models/forecasting/forecast_inputs.py -> ml/

with open(PROJECT_ROOT / "configs" / "config.yaml", "r") as f:
    CONFIG = yaml.safe_load(f)

REGION = CONFIG["region"]
FEATURE_COLUMNS = CONFIG["feature_columns"]
HORIZON = CONFIG["arima"]["forecast_horizon_years"]
AUTO_ORDER = CONFIG["arima"]["auto_order_selection"]
FALLBACK_ORDER = tuple(CONFIG["arima"]["fallback_order"])


def fit_and_forecast(series: pd.Series, horizon: int) -> tuple[list, str]:
    """
    Fits an ARIMA model to a single indicator's time series and forecasts
    `horizon` steps ahead.

    Returns (forecast_values, order_used_as_string).
    """
    order = FALLBACK_ORDER

    if AUTO_ORDER and PMDARIMA_AVAILABLE:
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                auto_model = auto_arima(
                    series,
                    seasonal=CONFIG["arima"]["seasonal"],
                    suppress_warnings=True,
                    error_action="ignore",
                    stepwise=True,
                )
            order = auto_model.order
        except Exception:
            order = FALLBACK_ORDER  # fall back if auto_arima fails to converge

    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            model = ARIMA(series, order=order)
            fitted = model.fit()
            forecast = fitted.forecast(steps=horizon)
    except Exception:
        # last-resort fallback: simplest possible order
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            model = ARIMA(series, order=(1, 1, 0))
            fitted = model.fit()
            forecast = fitted.forecast(steps=horizon)
        order = (1, 1, 0)

    return list(forecast), str(order)


def forecast_all_indicators() -> pd.DataFrame:
    """
    Runs ARIMA forecasting for all 12 indicators.

    Returns a DataFrame with one row per forecasted year, all indicator
    columns, plus arima_order and model_run_id metadata.
    """
    X, years = get_forecast_input_data(region=REGION)
    X = X.copy()
    X.index = years.values

    last_year = int(years.max())
    forecast_years = [last_year + i for i in range(1, HORIZON + 1)]
    model_run_id = f"arima_{pd.Timestamp.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}"

    results = {year: {"region": REGION, "year": year, "model_run_id": model_run_id} for year in forecast_years}
    orders_used = {}

    for col in FEATURE_COLUMNS:
        series = X[col]
        forecast_values, order_str = fit_and_forecast(series, HORIZON)
        orders_used[col] = order_str

        for year, value in zip(forecast_years, forecast_values):
            results[year][col] = round(float(value), 2)

        print(f"[forecast_inputs] {col}: order={order_str} -> "
              f"{[round(v, 2) for v in forecast_values]}")

    # Store a representative order string (orders differ per indicator,
    # so we join them compactly for traceability)
    order_summary = "; ".join(f"{k}={v}" for k, v in orders_used.items())
    for year in forecast_years:
        results[year]["arima_order"] = order_summary[:20]  # column is VARCHAR(20), keep it short

    return pd.DataFrame(list(results.values())), model_run_id


def run():
    df, model_run_id = forecast_all_indicators()
    records = df.to_dict(orient="records")
    inserted = insert_forecasts(records)
    print(f"\n[forecast_inputs] Inserted {inserted} forecast rows "
          f"(model_run_id={model_run_id}) for years: {df['year'].tolist()}")


if __name__ == "__main__":
    run()