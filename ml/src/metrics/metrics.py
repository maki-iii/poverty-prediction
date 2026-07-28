"""
Shared evaluation metrics for comparing ML models
(XGBoost, Ridge, Random Forest).
"""

import numpy as np
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score


def compute_metrics(y_true, y_pred) -> dict:
    """
    Computes RMSE, MAE, and R² for a set of true vs predicted values.
    Returns a dict so results are easy to log, compare, and store.
    """
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)

    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    mae = float(mean_absolute_error(y_true, y_pred))
    r2 = float(r2_score(y_true, y_pred))

    return {"rmse": rmse, "mae": mae, "r2": r2}


def format_metrics(metrics: dict) -> str:
    """Pretty-prints a metrics dict for console logging."""
    return f"RMSE={metrics['rmse']:.4f}  MAE={metrics['mae']:.4f}  R²={metrics['r2']:.4f}"


def is_better(candidate: dict, current_best: dict, selection_metric: str) -> bool:
    """
    Compares two metrics dicts and returns True if `candidate` is better
    than `current_best` on the configured selection_metric.

    Lower is better for rmse/mae; higher is better for r2.
    """
    if selection_metric == "r2":
        return candidate["r2"] > current_best["r2"]
    else:  # rmse or mae
        return candidate[selection_metric] < current_best[selection_metric]