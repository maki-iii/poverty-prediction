"""
Loads actuals from the database, validates them, and splits into
features (X) and target (y) for ML training.

Two entry points, for two different consumers:
    - get_forecast_input_data(): ALL actuals rows (APIS + FIES), used by
      ARIMA forecasting -- more historical points = better trend detection,
      and poverty_incidence isn't needed for forecasting inputs anyway.
    - get_training_data(): only rows where poverty_incidence is NOT NULL
      (i.e. FIES years), used by ML model training -- the target variable
      must actually exist to train on it.
"""

from pathlib import Path

import pandas as pd
import yaml

from src.database.repository.actuals_repo import get_actuals

PROJECT_ROOT = Path(__file__).resolve().parents[2]  # ml/src/preprocess/load_clean.py -> ml/

with open(PROJECT_ROOT / "configs" / "config.yaml", "r") as f:
    CONFIG = yaml.safe_load(f)

REGION = CONFIG["region"]
TARGET_COLUMN = CONFIG["target_column"]
FEATURE_COLUMNS = CONFIG["feature_columns"]


def load_actuals(region: str = None) -> pd.DataFrame:
    """Fetches all actuals rows for the given region (defaults to config region)."""
    region = region or REGION
    df = get_actuals(region=region)
    if df.empty:
        raise ValueError(
            f"No actuals found for region='{region}'. "
            f"Did you run init_db.py and seed_from_excel.py?"
        )
    return df


def _validate_common(df: pd.DataFrame, required_columns: set) -> pd.DataFrame:
    """Shared validation: required columns present, no duplicate years."""
    missing_cols = required_columns - set(df.columns)
    if missing_cols:
        raise ValueError(f"Missing expected columns from DB data: {missing_cols}")

    dupes = df[df.duplicated(subset=["region", "year"], keep=False)]
    if not dupes.empty:
        raise ValueError(f"Duplicate (region, year) rows found:\n{dupes[['region', 'year']]}")

    return df.sort_values("year").reset_index(drop=True)


def get_forecast_input_data(region: str = None):
    """
    Entry point for ARIMA forecasting.

    Returns ALL actuals rows (both APIS and FIES years) since forecasting
    only needs the 6 indicator columns, not poverty_incidence.

    Returns:
        X (pd.DataFrame): feature columns only
        years (pd.Series): year for each row
    """
    df = load_actuals(region)
    df = _validate_common(df, set(FEATURE_COLUMNS + ["year", "region"]))

    feature_null_counts = df[FEATURE_COLUMNS].isnull().sum()
    if feature_null_counts.any():
        raise ValueError(
            f"Found null values in indicator columns (these are required for "
            f"every actuals row regardless of survey type):\n"
            f"{feature_null_counts[feature_null_counts > 0]}"
        )

    for col in FEATURE_COLUMNS:
        df[col] = df[col].astype(float)

    X = df[FEATURE_COLUMNS].copy()
    years = df["year"].copy()

    return X, years


def get_training_data(region: str = None):
    """
    Entry point for ML model training.

    Returns only rows where poverty_incidence IS NOT NULL (i.e. FIES years)
    -- the target variable must actually exist to train on it. APIS-only
    years (no poverty_incidence) are excluded here.

    Returns:
        X (pd.DataFrame): feature columns only
        y (pd.Series): target column (poverty_incidence)
        years (pd.Series): year for each row, useful for time-aware splits
    """
    df = load_actuals(region)
    df = _validate_common(df, set(FEATURE_COLUMNS + [TARGET_COLUMN, "year", "region"]))

    # Only keep rows with a real target value (FIES years)
    df = df[df[TARGET_COLUMN].notna()].reset_index(drop=True)

    if df.empty:
        raise ValueError(
            f"No rows with a non-null '{TARGET_COLUMN}' found. "
            f"ML training requires at least some FIES-sourced years with poverty_incidence."
        )

    feature_null_counts = df[FEATURE_COLUMNS].isnull().sum()
    if feature_null_counts.any():
        raise ValueError(
            f"Found null values in indicator columns among training rows:\n"
            f"{feature_null_counts[feature_null_counts > 0]}"
        )

    for col in FEATURE_COLUMNS + [TARGET_COLUMN]:
        df[col] = df[col].astype(float)

    X = df[FEATURE_COLUMNS].copy()
    y = df[TARGET_COLUMN].copy()
    years = df["year"].copy()

    return X, y, years


if __name__ == "__main__":
    # Quick manual check: python -m src.preprocess.load_clean
    X_fc, years_fc = get_forecast_input_data()
    print(f"[load_clean] Forecast input data: {len(X_fc)} rows (APIS + FIES), "
          f"years {years_fc.min()}-{years_fc.max()}")

    X_tr, y_tr, years_tr = get_training_data()
    print(f"[load_clean] Training data: {len(X_tr)} rows (FIES only), "
          f"years {years_tr.min()}-{years_tr.max()}")