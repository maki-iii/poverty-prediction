"""Regression evaluation metrics and model ranking."""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


def regression_metrics(y_true, y_pred) -> dict[str, float]:
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    mse = mean_squared_error(y_true, y_pred)
    nonzero = np.where(np.abs(y_true) < 1e-9, np.nan, y_true)
    mape = np.nanmean(np.abs((y_true - y_pred) / nonzero)) * 100
    return {
        "r2": r2_score(y_true, y_pred),
        "mae": mean_absolute_error(y_true, y_pred),
        "mse": mse,
        "rmse": float(np.sqrt(mse)),
        "mape": float(mape),
    }


def rank_models(metrics_by_model: dict[str, dict[str, float]]) -> pd.DataFrame:
    """Rank by high R2 first, then low RMSE and MAE."""
    table = pd.DataFrame.from_dict(metrics_by_model, orient="index").reset_index()
    table = table.rename(columns={"index": "model"})
    return table.sort_values(["r2", "rmse", "mae"], ascending=[False, True, True]).reset_index(drop=True)
