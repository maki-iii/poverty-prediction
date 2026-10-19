"""
Loads the best trained model (best_model.pkl), pulls the latest ARIMA
forecasts (2024-2026 inputs) from the database, predicts poverty
incidence for each year, and saves the results to the `predictions` table.

Usage (from the ml/ folder):
    python -m src.models.ml.predict_poverty
"""

import json
from decimal import Decimal, ROUND_DOWN
from pathlib import Path

import joblib
import pandas as pd
import yaml

from src.database.repository.predictions_repo import insert_predictions, get_current_predictions
from src.database.repository.forecasts_repo import get_current_forecasts
from src.database.repository.actuals_repo import get_actuals
from src.pipeline.year_selection import historical_rows, latest_history_year, FORECAST_HORIZON
import numpy as np
import uuid

PROJECT_ROOT = Path(__file__).resolve().parents[3]  # ml/src/models/ml/predict_poverty.py -> ml/
from src.pipeline.indicator_basis import SAVED_MODELS_DIR, INDICATOR_BASIS

with open(PROJECT_ROOT / "configs" / "config.yaml", "r") as f:
    CONFIG = yaml.safe_load(f)

REGION = CONFIG["region"]
FEATURE_COLUMNS = CONFIG["feature_columns"]


def truncate_poverty(value):
    """Keep two decimal places without rounding up or float multiplication drift."""
    return float(Decimal(str(float(value))).quantize(Decimal("0.01"), rounding=ROUND_DOWN))


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
    """Only the three future years after the latest actual/interpolated year."""
    return get_current_forecasts(region=REGION)



def predict():
    model, model_name = load_best_model()
    actuals = historical_rows(get_actuals(region=REGION))
    anchor = latest_history_year(actuals)
    expected_years = list(range(anchor + 1, anchor + FORECAST_HORIZON + 1))
    forecasts_df = load_latest_forecasts()
    if forecasts_df.empty:
        raise ValueError("Run forecasting first for the current three-year window.")
    inputs = forecasts_df.loc[forecasts_df["year"].isin(expected_years)].copy()
    inputs = inputs.sort_values("year")
    if inputs["year"].tolist() != expected_years:
        raise ValueError(f"Forecast inputs must cover exactly {expected_years}. Run forecasting first.")
    inputs["input_source"] = "forecast"
    X_future = inputs[FEATURE_COLUMNS].astype(float)
    if not np.isfinite(X_future.to_numpy()).all():
        raise ValueError("Prediction inputs must be finite.")
    predictions = model.predict(X_future)
    if not np.isfinite(predictions).all():
        raise ValueError("Model returned non-finite poverty predictions.")
    predictions = np.clip(predictions, 0, 100)
    prediction_run_id = f"pred_{pd.Timestamp.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}"

    records = []
    for (_, row), pred_value in zip(inputs.iterrows(), predictions):
        year = int(row["year"])
        stored_value = truncate_poverty(pred_value)
        records.append({
            "region": REGION,
            "year": int(year),
            "predicted_poverty_incidence": stored_value,
            "model_used": model_name,
            "input_source": row["input_source"],
            "model_run_id": prediction_run_id,
            "indicator_basis": INDICATOR_BASIS,
        })
        print(f"[predict_poverty] {year}: {stored_value:.2f}% "
              f"(model={model_name}, input_source={row['input_source']})")

    inserted = insert_predictions(records)
    print(f"\n[predict_poverty] Inserted {inserted} predictions "
          f"(model_run_id={prediction_run_id})")

    return records


if __name__ == "__main__":
    predict()
