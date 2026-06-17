"""ARIMA forecasting utilities.

Statsmodels is used when installed. A compact ARIMA(1,1,1) fallback is included
so the project still runs in lightweight environments.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd
from scipy.optimize import minimize


@dataclass(frozen=True)
class ForecastResult:
    year: int
    forecast: float
    lower_ci: float
    upper_ci: float
    region: str
    method: str


def forecast_region_arima(
    history: pd.DataFrame,
    region: str,
    periods: int = 3,
    target_col: str = "poverty_incidence",
    year_col: str = "year",
) -> pd.DataFrame:
    series = (
        history.sort_values(year_col)[target_col]
        .astype(float)
        .interpolate(limit_direction="both")
        .to_numpy()
    )
    years = history.sort_values(year_col)[year_col].astype(int).to_numpy()
    if len(series) < 5:
        raise ValueError(f"Need at least 5 observations for ARIMA forecasting: {region}")

    try:
        return _forecast_with_statsmodels(series, years, region, periods)
    except Exception:
        return _forecast_with_fallback(series, years, region, periods)


def _forecast_with_statsmodels(series: np.ndarray, years: np.ndarray, region: str, periods: int) -> pd.DataFrame:
    from statsmodels.tsa.arima.model import ARIMA

    model = ARIMA(series, order=(1, 1, 1)).fit()
    pred = model.get_forecast(steps=periods)
    mean = pred.predicted_mean
    conf = pred.conf_int(alpha=0.05)
    rows = []
    for step in range(periods):
        rows.append(
            ForecastResult(
                year=int(years[-1] + step + 1),
                forecast=float(mean[step]),
                lower_ci=float(conf[step, 0]),
                upper_ci=float(conf[step, 1]),
                region=region,
                method="statsmodels_arima_1_1_1",
            ).__dict__
        )
    return pd.DataFrame(rows)


def _forecast_with_fallback(series: np.ndarray, years: np.ndarray, region: str, periods: int) -> pd.DataFrame:
    diff = np.diff(series)
    if len(diff) < 4:
        drift = diff.mean() if len(diff) else 0
        sigma = diff.std(ddof=1) if len(diff) > 1 else 1.0
        phi, theta = 0.0, 0.0
        residuals = diff - drift
    else:
        drift, phi, theta, residuals = _fit_arma_1_1(diff)

    forecasts = []
    current = float(series[-1])
    last_diff = float(diff[-1])
    last_error = float(residuals[-1]) if len(residuals) else 0.0
    sigma = float(np.std(residuals, ddof=1)) if len(residuals) > 1 else float(np.std(diff) or 1.0)

    for step in range(1, periods + 1):
        next_diff = drift + phi * (last_diff - drift) + theta * last_error
        current = current + next_diff
        interval = 1.96 * sigma * np.sqrt(step)
        forecasts.append(
            ForecastResult(
                year=int(years[-1] + step),
                forecast=float(np.clip(current, 0, 100)),
                lower_ci=float(np.clip(current - interval, 0, 100)),
                upper_ci=float(np.clip(current + interval, 0, 100)),
                region=region,
                method="fallback_arima_1_1_1",
            ).__dict__
        )
        last_diff = next_diff
        last_error = 0.0

    return pd.DataFrame(forecasts)


def _fit_arma_1_1(diff: np.ndarray) -> tuple[float, float, float, np.ndarray]:
    drift0 = float(np.mean(diff))

    def residuals(params: np.ndarray) -> np.ndarray:
        drift, raw_phi, raw_theta = params
        phi = np.tanh(raw_phi)
        theta = np.tanh(raw_theta)
        errors = np.zeros_like(diff, dtype=float)
        for i in range(1, len(diff)):
            pred = drift + phi * (diff[i - 1] - drift) + theta * errors[i - 1]
            errors[i] = diff[i] - pred
        return errors[1:]

    def objective(params: np.ndarray) -> float:
        err = residuals(params)
        return float(np.sum(err**2))

    opt = minimize(objective, np.array([drift0, 0.1, 0.1]), method="Nelder-Mead")
    drift, raw_phi, raw_theta = opt.x
    phi = float(np.tanh(raw_phi))
    theta = float(np.tanh(raw_theta))
    full_errors = np.zeros_like(diff, dtype=float)
    for i in range(1, len(diff)):
        pred = drift + phi * (diff[i - 1] - drift) + theta * full_errors[i - 1]
        full_errors[i] = diff[i] - pred
    return float(drift), phi, theta, full_errors
