import warnings
import pandas as pd

from statsmodels.tsa.arima.model import ARIMA

from config.settings import (
    FEATURE_DATA_PATH,
    REGRESSION_PREDICTION_PATH,
    ARIMA_FORECAST_PATH,
    YEAR_COLUMN,
    REGION_COLUMN,
    TARGET_COLUMN,
    ARIMA_FORECAST_YEARS,
)

warnings.filterwarnings("ignore")


def load_feature_data():
    return pd.read_csv(FEATURE_DATA_PATH)


def load_regression_predictions():
    return pd.read_csv(REGRESSION_PREDICTION_PATH)


def get_best_arima_order(series):
    best_order = None
    best_aic = float("inf")

    p_values = range(0, 3)
    d_values = range(0, 2)
    q_values = range(0, 3)

    for p in p_values:
        for d in d_values:
            for q in q_values:
                try:
                    model = ARIMA(series, order=(p, d, q))
                    fitted_model = model.fit()

                    if fitted_model.aic < best_aic:
                        best_aic = fitted_model.aic
                        best_order = (p, d, q)

                except Exception:
                    continue

    return best_order


def build_series_with_regression_prediction(region_df, prediction_df, region):
    actual_series_df = region_df[[YEAR_COLUMN, TARGET_COLUMN]].copy()

    region_prediction = prediction_df[
        prediction_df[REGION_COLUMN] == region
    ]

    if region_prediction.empty:
        return actual_series_df

    predicted_year = int(region_prediction["prediction_year"].iloc[0])
    predicted_value = float(
        region_prediction["regression_predicted_poverty_incidence"].iloc[0]
    )

    predicted_row = pd.DataFrame([
        {
            YEAR_COLUMN: predicted_year,
            TARGET_COLUMN: predicted_value,
        }
    ])

    combined_series_df = pd.concat(
        [actual_series_df, predicted_row],
        ignore_index=True
    )

    combined_series_df = (
        combined_series_df
        .drop_duplicates(subset=[YEAR_COLUMN], keep="last")
        .sort_values(YEAR_COLUMN)
        .reset_index(drop=True)
    )

    return combined_series_df


def forecast_region(series, forecast_years):
    if len(series) < 4:
        return None, None

    best_order = get_best_arima_order(series)

    if best_order is None:
        return None, None

    model = ARIMA(series, order=best_order)
    fitted_model = model.fit()

    forecast = fitted_model.forecast(steps=forecast_years)

    return forecast, best_order


def run_arima_forecasting():
    df = load_feature_data()
    prediction_df = load_regression_predictions()

    forecast_results = []

    for region in df[REGION_COLUMN].unique():
        region_df = (
            df[df[REGION_COLUMN] == region]
            .sort_values(YEAR_COLUMN)
        )

        combined_series_df = build_series_with_regression_prediction(
            region_df,
            prediction_df,
            region
        )

        series = combined_series_df[TARGET_COLUMN]

        latest_training_year = int(combined_series_df[YEAR_COLUMN].max())

        forecast, best_order = forecast_region(
            series,
            ARIMA_FORECAST_YEARS
        )

        if forecast is None:
            continue

        for index, value in enumerate(forecast, start=1):
            forecast_results.append({
                REGION_COLUMN: region,
                "forecast_year": latest_training_year + index,
                "arima_forecast_poverty_incidence": value,
                "arima_order": best_order,
                "used_regression_prediction_in_training": True,
            })

    forecast_df = pd.DataFrame(forecast_results)

    ARIMA_FORECAST_PATH.parent.mkdir(parents=True, exist_ok=True)
    forecast_df.to_csv(ARIMA_FORECAST_PATH, index=False)

    print("ARIMA forecasting completed.")
    print("ARIMA used actual poverty incidence + regression prediction.")
    print(f"Forecast saved to: {ARIMA_FORECAST_PATH}")
    print(f"Rows: {forecast_df.shape[0]}")

    return forecast_df


if __name__ == "__main__":
    run_arima_forecasting()