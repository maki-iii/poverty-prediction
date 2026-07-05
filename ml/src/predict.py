import joblib
import pandas as pd

from config.settings import (
    FEATURE_DATA_PATH,
    BEST_MODEL_PATH,
    REGRESSION_PREDICTION_PATH,
    ARIMA_FORECAST_PATH,
    YEAR_COLUMN,
    REGION_COLUMN,
    TARGET_COLUMN,
)


def load_best_model():
    return joblib.load(BEST_MODEL_PATH)


def load_feature_data():
    return pd.read_csv(FEATURE_DATA_PATH)


def get_training_columns(df):
    excluded = [
        YEAR_COLUMN,
        REGION_COLUMN,
        TARGET_COLUMN,
    ]

    return [
        col for col in df.columns
        if col not in excluded
    ]


def get_latest_region_rows(df):
    latest_rows = (
        df.sort_values(YEAR_COLUMN)
        .groupby(REGION_COLUMN)
        .tail(1)
        .reset_index(drop=True)
    )

    return latest_rows


def predict_next_year():
    model = load_best_model()
    df = load_feature_data()

    feature_columns = get_training_columns(df)
    latest_rows = get_latest_region_rows(df)

    latest_year = int(df[YEAR_COLUMN].max())
    prediction_year = latest_year + 1

    X_next = latest_rows[feature_columns]

    predictions = model.predict(X_next)

    prediction_df = pd.DataFrame({
        REGION_COLUMN: latest_rows[REGION_COLUMN],
        "prediction_year": prediction_year,
        "regression_predicted_poverty_incidence": predictions,
    })

    REGRESSION_PREDICTION_PATH.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    prediction_df.to_csv(
        REGRESSION_PREDICTION_PATH,
        index=False
    )

    print("Regression prediction completed.")
    print(f"Prediction saved to: {REGRESSION_PREDICTION_PATH}")

    return prediction_df


def merge_regression_and_arima():
    regression_df = pd.read_csv(REGRESSION_PREDICTION_PATH)

    try:
        arima_df = pd.read_csv(ARIMA_FORECAST_PATH)
    except FileNotFoundError:
        print("ARIMA forecast file not found. Skipping merge.")
        return regression_df

    merged_df = regression_df.merge(
        arima_df,
        left_on=[REGION_COLUMN, "prediction_year"],
        right_on=[REGION_COLUMN, "forecast_year"],
        how="left"
    )

    final_path = REGRESSION_PREDICTION_PATH.parent / "final_predictions.csv"

    merged_df.to_csv(final_path, index=False)

    print("Final prediction file created.")
    print(f"Saved to: {final_path}")

    return merged_df


def run_prediction():
    predict_next_year()
    final_df = merge_regression_and_arima()

    return final_df


if __name__ == "__main__":
    run_prediction()