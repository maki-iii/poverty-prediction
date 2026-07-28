"""
Loads the best trained model (best_model.pkl), pulls the latest ARIMA
forecasts (2024-2026 inputs) from the database, predicts poverty
incidence for each year, and saves the results to the `predictions` table.

Usage (from the ml/ folder):
    python -m src.models.ml.predict_poverty
"""

import json
from pathlib import Path

import joblib
import pandas as pd
import yaml

from src.database.repository.forecasts_repo import get_forecasts, get_latest_run_id
from src.database.repository.predictions_repo import insert_predictions

PROJECT_ROOT = Path(__file__).resolve().parents[3]  # ml/src/models/ml/predict_poverty.py -> ml/
SAVED_MODELS_DIR = PROJECT_ROOT / "saved_models" / "ml"

with open(PROJECT_ROOT / "configs" / "config.yaml", "r") as f:
    CONFIG = yaml.safe_load(f)

REGION = CONFIG["region"]
FEATURE_COLUMNS = CONFIG["feature_columns"]


def load_best_model():
    """Loads best_model.pkl and its name from model_comparison_results.json."""
    model_path = SAVED_MODELS_DIR / "best_model.pkl"
    if not model_path.exists():
        raise FileNotFoundError(
            f"{model_path} not found. Run evaluate.py first to select and save the best model."
        )
    model = joblib.load(model_path)

    report_path = SAVED_MODELS_DIR / "model_comparison_results.json"
    with open(report_path, "r") as f:
        report = json.load(f)
    model_name = report["best_model"]

    return model, model_name


def load_latest_forecasts() -> pd.DataFrame:
    """Fetches the most recent ARIMA forecast batch (2024-2026 inputs)."""
    latest_run_id = get_latest_run_id(region=REGION)
    if latest_run_id is None:
        raise ValueError(
            "No forecasts found in the database. Run forecast_inputs.py first."
        )
    df = get_forecasts(region=REGION, model_run_id=latest_run_id)
    return df, latest_run_id


def predict():
    model, model_name = load_best_model()
    forecasts_df, forecast_run_id = load_latest_forecasts()

    # Cast DB Decimal types to float for sklearn/xgboost compatibility
    X_future = forecasts_df[FEATURE_COLUMNS].copy()
    for col in FEATURE_COLUMNS:
        X_future[col] = X_future[col].astype(float)

    predictions = model.predict(X_future)

    prediction_run_id = f"pred_{pd.Timestamp.now().strftime('%Y%m%d_%H%M%S')}"

    records = []
    for year, pred_value in zip(forecasts_df["year"], predictions):
        records.append({
            "region": REGION,
            "year": int(year),
            "predicted_poverty_incidence": round(float(pred_value), 2),
            "model_used": model_name,
            "input_source": "forecast",
            "model_run_id": prediction_run_id,
        })
        print(f"[predict_poverty] {year}: {round(float(pred_value), 2)}% "
              f"(model={model_name}, inputs from ARIMA run {forecast_run_id})")

    inserted = insert_predictions(records)
    print(f"\n[predict_poverty] Inserted {inserted} predictions "
          f"(model_run_id={prediction_run_id})")

    return records


if __name__ == "__main__":
    predict()