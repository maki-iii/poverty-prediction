"""
Deep-dive diagnostic for a single indicator's ARIMA forecast. Prints the
historical series and compares several candidate ARIMA configurations
(with/without trend/drift) side by side, so you can pick a defensible
order instead of blindly trusting auto_arima's default.

Usage (from the ml/ folder):
    python -m src.models.forecasting.indicator_diagnostic employment_rate
"""

import sys
import warnings

import pandas as pd
from statsmodels.tsa.arima.model import ARIMA

from src.preprocess.load_clean import get_training_data

HORIZON = 3

# Candidate (order, trend) pairs to compare.
# trend: 'n' = no trend/drift, 'c' = constant/drift, 't' = linear trend
CANDIDATES = [
    ((0, 1, 0), "n", "random walk, no drift (auto_arima's pick)"),
    ((0, 1, 0), "t", "random walk WITH linear drift"),
    ((1, 1, 0), "n", "AR(1) on differences, no trend"),
    ((1, 1, 0), "t", "AR(1) on differences, with trend"),
    ((2, 1, 0), "n", "AR(2) on differences, no trend"),
]


def diagnose(indicator: str):
    X, y, years = get_training_data()
    X.index = years.values
    series = X[indicator]

    print(f"[diagnostic] Historical values for '{indicator}':\n")
    print(series.to_string())
    print(f"\n[diagnostic] Change from first to last year: "
          f"{series.iloc[0]:.2f} -> {series.iloc[-1]:.2f} "
          f"({series.iloc[-1] - series.iloc[0]:+.2f} over {len(series)-1} years)\n")

    print(f"{'Order':>12s} {'Trend':>6s} {'AIC':>10s}  {'Forecast (3yr)':40s}  Description")
    print("-" * 110)

    for order, trend, description in CANDIDATES:
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                model = ARIMA(series, order=order, trend=trend)
                fitted = model.fit()
                forecast = fitted.forecast(steps=HORIZON)
            forecast_str = ", ".join(f"{v:.2f}" for v in forecast)
            print(f"{str(order):>12s} {trend:>6s} {fitted.aic:10.2f}  {forecast_str:40s}  {description}")
        except Exception as e:
            print(f"{str(order):>12s} {trend:>6s} {'FAILED':>10s}  {str(e)[:40]}")


if __name__ == "__main__":
    indicator = sys.argv[1] if len(sys.argv) > 1 else "employment_rate"
    diagnose(indicator)