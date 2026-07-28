"""
Diagnostic helpers for ARIMA modeling: stationarity testing (ADF) and
differencing order suggestion. Used by forecast_inputs.py before fitting
each indicator's ARIMA model.
"""

import warnings

import pandas as pd
from statsmodels.tsa.stattools import adfuller


def adf_test(series: pd.Series, significance: float = 0.05) -> dict:
    """
    Augmented Dickey-Fuller test for stationarity.

    Returns a dict with the test statistic, p-value, and whether the
    series is stationary at the given significance level.
    """
    series = series.dropna()

    if len(series) < 4:
        # Too few points for a meaningful ADF test
        return {"stat": None, "p_value": None, "is_stationary": False, "note": "series too short"}

    if series.nunique() == 1:
        # Constant series (e.g. after over-differencing) -- trivially stationary,
        # adfuller() can't run on it and raises ValueError otherwise.
        return {"stat": None, "p_value": 0.0, "is_stationary": True, "note": "constant series"}

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        try:
            result = adfuller(series, autolag="AIC")
        except ValueError as e:
            return {"stat": None, "p_value": None, "is_stationary": False, "note": str(e)}

    stat, p_value = result[0], result[1]
    return {
        "stat": stat,
        "p_value": p_value,
        "is_stationary": p_value < significance,
        "note": None,
    }


def suggest_d(series: pd.Series, max_d: int = 2, significance: float = 0.05) -> int:
    """
    Suggests the differencing order 'd' for ARIMA by repeatedly
    differencing until the series becomes stationary (or max_d reached).
    """
    current = series.copy()
    for d in range(max_d + 1):
        test = adf_test(current, significance)
        if test["is_stationary"]:
            return d
        current = current.diff().dropna()
    return max_d  # fallback if never stationary within max_d differences


def diagnose_all(df: pd.DataFrame, columns: list, significance: float = 0.05) -> pd.DataFrame:
    """
    Runs ADF test + suggested 'd' for each indicator column.
    Returns a summary DataFrame -- useful for a quick sanity check before
    forecasting, and for logging arima_order provenance.
    """
    rows = []
    for col in columns:
        test = adf_test(df[col])
        suggested_d = suggest_d(df[col])
        rows.append({
            "indicator": col,
            "adf_stat": test["stat"],
            "p_value": test["p_value"],
            "is_stationary": test["is_stationary"],
            "suggested_d": suggested_d,
        })
    return pd.DataFrame(rows)


if __name__ == "__main__":
    # Quick manual check: python -m src.models.forecasting.arima_diagnostics
    from src.preprocess.load_clean import get_training_data

    X, y, years = get_training_data()
    X["year"] = years.values
    X = X.set_index("year")

    summary = diagnose_all(X, list(X.columns))
    print(summary.to_string(index=False))