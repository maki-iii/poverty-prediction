from src.preprocessing import run_preprocessing
from src.feature_engineering import run_feature_engineering
from src.train.compare_models import train_and_compare_models
from src.predict import run_prediction
from src.train.arima import run_arima_forecasting


def progress(percent, message):
    print(f"[PROGRESS] {percent}|{message}", flush=True)


def main():
    print("=" * 50, flush=True)
    print("Regional Poverty Prediction ML Pipeline", flush=True)
    print("=" * 50, flush=True)

    progress(10, "Preprocessing master dataset")
    run_preprocessing()

    progress(25, "Creating lag features")
    run_feature_engineering()

    progress(40, "Training and comparing models")
    train_and_compare_models()

    progress(80, "Generating regression prediction")
    run_prediction()

    progress(90, "Running ARIMA forecasting")
    run_arima_forecasting()

    progress(100, "Training completed")
    print("Pipeline completed successfully.", flush=True)


if __name__ == "__main__":
    main()