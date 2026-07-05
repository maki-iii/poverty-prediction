import pandas as pd

from config.settings import (
    PROCESSED_DATA_PATH,
    FEATURE_DATA_PATH,
    YEAR_COLUMN,
    REGION_COLUMN,
    TARGET_COLUMN,
    LAG_YEARS,
)

def load_processed_data(path=PROCESSED_DATA_PATH):
    return pd.read_csv(path)

def get_feature_columns(df):
    excluded = [
        YEAR_COLUMN,
        REGION_COLUMN,
        TARGET_COLUMN,
    ]

    return [
        col for col in df.columns
        if col not in excluded
    ]

def create_lag_features(df):
    df = df.copy()

    df = df.sort_values(
        by=[REGION_COLUMN, YEAR_COLUMN]
    )

    feature_columns = get_feature_columns(df)

    lag_columns = feature_columns + [TARGET_COLUMN]

    for col in lag_columns:
        for lag in range(1, LAG_YEARS + 1):
            df[f"{col}_lag_{lag}"] = (
                df.groupby(REGION_COLUMN)[col].shift(lag)
            )

    df = df.dropna().reset_index(drop=True)

    return df

def save_feature_data(df, path=FEATURE_DATA_PATH):
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False)

def run_feature_engineering():
    df = load_processed_data()

    feature_df = create_lag_features(df)

    save_feature_data(feature_df)

    print("Feature engineering completed.")
    print(f"Feature data saved to: {FEATURE_DATA_PATH}")
    print(f"Rows: {feature_df.shape[0]}")
    print(f"Columns: {feature_df.shape[1]}")

    return feature_df


if __name__ == "__main__":
    run_feature_engineering()