import pandas as pd

from config.settings import (
    MASTER_RAW_DATA_PATH,
    PROCESSED_DATA_PATH,
    YEAR_COLUMN,
    REGION_COLUMN,
    POVERTY_STATUS_COLUMN,
    TARGET_COLUMN,
    AUTO_DETECT_FEATURES,
    EXCLUDED_COLUMNS,
    MANUAL_NUMERIC_FEATURES,
    MANUAL_CATEGORICAL_FEATURES,
)


def load_raw_data(path=MASTER_RAW_DATA_PATH):
    return pd.read_csv(path)


def validate_required_columns(df):
    required_columns = [
        YEAR_COLUMN,
        REGION_COLUMN,
        POVERTY_STATUS_COLUMN,
    ]

    missing_columns = [
        col for col in required_columns
        if col not in df.columns
    ]

    if missing_columns:
        raise ValueError(
            f"Missing required columns: {missing_columns}"
        )


def clean_data(df):
    df = df.copy()
    df = df.drop_duplicates()

    df[YEAR_COLUMN] = pd.to_numeric(
        df[YEAR_COLUMN],
        errors="coerce"
    )

    df[POVERTY_STATUS_COLUMN] = pd.to_numeric(
        df[POVERTY_STATUS_COLUMN],
        errors="coerce"
    )

    df = df.dropna(
        subset=[
            YEAR_COLUMN,
            REGION_COLUMN,
            POVERTY_STATUS_COLUMN,
        ]
    )

    df[YEAR_COLUMN] = df[YEAR_COLUMN].astype(int)

    return df


def detect_features(df):
    if not AUTO_DETECT_FEATURES:
        return MANUAL_NUMERIC_FEATURES, MANUAL_CATEGORICAL_FEATURES

    feature_candidates = [
        col for col in df.columns
        if col not in EXCLUDED_COLUMNS
    ]

    numeric_features = []
    categorical_features = []

    for col in feature_candidates:
        converted = pd.to_numeric(df[col], errors="coerce")

        numeric_ratio = converted.notna().mean()

        if numeric_ratio >= 0.80:
            df[col] = converted
            numeric_features.append(col)
        else:
            categorical_features.append(col)

    return numeric_features, categorical_features


def fill_missing_values(df, numeric_features, categorical_features):
    df = df.copy()

    for col in numeric_features:
        if col in df.columns:
            df[col] = df[col].fillna(df[col].median())

    for col in categorical_features:
        if col in df.columns:
            df[col] = df[col].fillna("Unknown")

    return df


def aggregate_to_regional_yearly(df, numeric_features, categorical_features):
    df = df.copy()

    agg_dict = {}

    for col in numeric_features:
        if col in df.columns:
            agg_dict[col] = "mean"

    categorical_dummy_columns = []

    for col in categorical_features:
        if col in df.columns:
            dummies = pd.get_dummies(
                df[col],
                prefix=col,
                dummy_na=False
            )

            df = pd.concat([df, dummies], axis=1)

            categorical_dummy_columns.extend(dummies.columns)

    for col in categorical_dummy_columns:
        agg_dict[col] = "mean"

    agg_dict[POVERTY_STATUS_COLUMN] = "mean"

    regional_df = (
        df.groupby([REGION_COLUMN, YEAR_COLUMN])
        .agg(agg_dict)
        .reset_index()
    )

    regional_df[TARGET_COLUMN] = (
        regional_df[POVERTY_STATUS_COLUMN] * 100
    )

    regional_df = regional_df.drop(
        columns=[POVERTY_STATUS_COLUMN]
    )

    return regional_df


def save_processed_data(df, path=PROCESSED_DATA_PATH):
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False)


def run_preprocessing():
    df = load_raw_data()

    validate_required_columns(df)

    df = clean_data(df)

    numeric_features, categorical_features = detect_features(df)

    df = fill_missing_values(
        df,
        numeric_features,
        categorical_features
    )

    regional_df = aggregate_to_regional_yearly(
        df,
        numeric_features,
        categorical_features
    )

    save_processed_data(regional_df)

    print("Preprocessing completed.")
    print(f"Processed data saved to: {PROCESSED_DATA_PATH}")
    print(f"Rows: {regional_df.shape[0]}")
    print(f"Columns: {regional_df.shape[1]}")
    print(f"Detected numeric features: {len(numeric_features)}")
    print(f"Detected categorical features: {len(categorical_features)}")

    return regional_df


if __name__ == "__main__":
    run_preprocessing()