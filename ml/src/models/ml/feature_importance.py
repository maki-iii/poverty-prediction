"""
Inspects which features the best model (Random Forest, in this case)
actually relies on. Helps diagnose why forecasted years might produce
identical or near-identical predictions.

Usage (from the ml/ folder):
    python -m src.models.ml.feature_importance
"""

import json
from pathlib import Path

import joblib
import pandas as pd
import yaml

from src.database.repository.forecasts_repo import get_forecasts, get_latest_run_id
from src.preprocess.load_clean import get_training_data

PROJECT_ROOT = Path(__file__).resolve().parents[3]  # ml/src/models/ml/feature_importance.py -> ml/
from src.pipeline.indicator_basis import SAVED_MODELS_DIR

with open(PROJECT_ROOT / "configs" / "config.yaml", "r") as f:
    CONFIG = yaml.safe_load(f)

REGION = CONFIG["region"]
FEATURE_COLUMNS = CONFIG["feature_columns"]


def load_best_model_and_name():
    model = joblib.load(SAVED_MODELS_DIR / "best_model.pkl")
    with open(SAVED_MODELS_DIR / "model_comparison_results.json", "r") as f:
        report = json.load(f)
    return model, report["best_model"]


def show_feature_importance():
    model, model_name = load_best_model_and_name()

    print(f"[feature_importance] Best model: {model_name}\n")

    if hasattr(model, "feature_importances_"):
        # Random Forest / XGBoost expose this directly
        importances = pd.Series(model.feature_importances_, index=FEATURE_COLUMNS)
        importances = importances.sort_values(ascending=False)
        print("Feature importances (higher = more influence on splits):")
        for feat, score in importances.items():
            bar = "█" * int(score * 50)
            print(f"  {feat:30s} {score:.4f}  {bar}")
    elif hasattr(model, "named_steps") and "ridge" in getattr(model, "named_steps", {}):
        # Ridge is wrapped in a Pipeline(scaler, ridge) -- use coefficients instead
        coefs = pd.Series(model.named_steps["ridge"].coef_, index=FEATURE_COLUMNS)
        coefs = coefs.reindex(coefs.abs().sort_values(ascending=False).index)
        print("Ridge coefficients (standardized -- higher |value| = more influence):")
        for feat, val in coefs.items():
            print(f"  {feat:30s} {val:+.4f}")
    else:
        print("Model type doesn't expose importances/coefficients directly.")


def compare_forecast_years_to_training_range():
    """
    Shows whether the 2024-2026 forecasted values actually fall within
    (or outside) the range the model was trained on -- if forecasts are
    within an existing leaf's range, RF will predict the same value.
    """
    X_train, y_train, years_train = get_training_data(region=REGION)

    latest_run_id = get_latest_run_id(region=REGION)
    forecasts_df = get_forecasts(region=REGION, model_run_id=latest_run_id)
    X_future = forecasts_df[FEATURE_COLUMNS].astype(float)

    print("\n[feature_importance] Training data range vs. forecasted values:\n")
    print(f"{'Feature':30s} {'Train Min':>12s} {'Train Max':>12s} {'2024':>10s} {'2025':>10s} {'2026':>10s}")
    for col in FEATURE_COLUMNS:
        train_min = X_train[col].min()
        train_max = X_train[col].max()
        vals = X_future[col].tolist()
        print(f"{col:30s} {train_min:12.2f} {train_max:12.2f} "
              f"{vals[0]:10.2f} {vals[1]:10.2f} {vals[2]:10.2f}")

def get_feature_importance_data() -> dict:
    """
    Same logic as show_feature_importance(), but returns structured data
    for the API instead of printing to console.
    """
    model, model_name = load_best_model_and_name()

    importances = {}
    if hasattr(model, "feature_importances_"):
        for feat, score in zip(FEATURE_COLUMNS, model.feature_importances_):
            importances[feat] = round(float(score), 4)
    elif hasattr(model, "named_steps") and "ridge" in getattr(model, "named_steps", {}):
        for feat, coef in zip(FEATURE_COLUMNS, model.named_steps["ridge"].coef_):
            importances[feat] = round(float(abs(coef)), 4)
    else:
        raise ValueError(f"Model type '{model_name}' doesn't expose importances/coefficients.")

    # Sort descending by importance
    importances = dict(sorted(importances.items(), key=lambda x: x[1], reverse=True))

    top_feature = next(iter(importances))
    top_score = importances[top_feature]

    return {
        "model_used": model_name,
        "importances": importances,
        "top_feature": top_feature,
        "top_feature_pct": round(top_score * 100, 1),
    }

if __name__ == "__main__":
    show_feature_importance()
    compare_forecast_years_to_training_range()
