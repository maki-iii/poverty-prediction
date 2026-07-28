"""
Orchestrates the full pipeline end-to-end:
    1. Forecast inputs (ARIMA) for the next horizon
    2. Train all active ML models
    3. Evaluate and select the best model
    4. Predict poverty incidence using the best model on the forecasted inputs

Usage (from the ml/ folder):
    python -m src.pipeline.run_full_pipeline
"""

from src.models.forecasting.forecast_inputs import run as run_forecast
from src.models.ml.evaluate import run as run_evaluate
from src.models.ml.predict_poverty import predict as run_predict


def run_full_pipeline():
    print("=" * 70)
    print("STEP 1/3: Forecasting inputs (ARIMA)")
    print("=" * 70)
    run_forecast()

    print("\n" + "=" * 70)
    print("STEP 2/3: Training and evaluating ML models")
    print("=" * 70)
    best_model_name = run_evaluate()

    print("\n" + "=" * 70)
    print(f"STEP 3/3: Predicting poverty incidence (using {best_model_name})")
    print("=" * 70)
    run_predict()

    print("\n" + "=" * 70)
    print("PIPELINE COMPLETE")
    print("=" * 70)


if __name__ == "__main__":
    run_full_pipeline()