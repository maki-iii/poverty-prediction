"""Train on actual/interpolated history, extend indicator history, then predict poverty."""
from src.models.forecasting.forecast_inputs import run as run_forecast
from src.models.ml.evaluate import run as run_evaluate
from src.models.ml.predict_poverty import predict as run_predict


def run_full_pipeline():
    print("STEP 1/3: Training and evaluating ML models (actual + interpolated only)")
    best_model_name = run_evaluate()
    print("STEP 2/3: Forecasting indicators from combined history")
    run_forecast()
    print(f"STEP 3/3: Predicting poverty incidence (using {best_model_name})")
    run_predict()
    print("PIPELINE COMPLETE")


if __name__ == "__main__":
    run_full_pipeline()
