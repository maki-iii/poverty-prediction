"""
Loads actuals from the database, validates them, and splits into
features (X) and target (y) for ML training.

This is the bridge between the database layer and the ML layer --
train.py calls get_training_data() instead of touching the DB directly.
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


def validate(df: pd.DataFrame) -> pd.DataFrame:
    """
    Basic sanity checks before training:
    - required columns present
    - no missing values in features/target
    - no duplicate years
    """
    required = set(FEATURE_COLUMNS + [TARGET_COLUMN, "year", "region"])
    missing_cols = required - set(df.columns)
    if missing_cols:
        raise ValueError(f"Missing expected columns from DB data: {missing_cols}")

    null_counts = df[FEATURE_COLUMNS + [TARGET_COLUMN]].isnull().sum()
    if null_counts.any():
        raise ValueError(f"Found null values in actuals data:\n{null_counts[null_counts > 0]}")

    dupes = df[df.duplicated(subset=["region", "year"], keep=False)]
    if not dupes.empty:
        raise ValueError(f"Duplicate (region, year) rows found:\n{dupes[['region', 'year']]}")

    return df.sort_values("year").reset_index(drop=True)


def get_training_data(region: str = None):
    """
    Main entry point for the ML layer.

    Returns:
        X (pd.DataFrame): feature columns only
        y (pd.Series): target column (poverty_incidence)
        years (pd.Series): year for each row, useful for time-aware splits
    """
    df = load_actuals(region)
    df = validate(df)

    # Cast DB Decimal types to float for sklearn/xgboost compatibility
    for col in FEATURE_COLUMNS + [TARGET_COLUMN]:
        df[col] = df[col].astype(float)

    X = df[FEATURE_COLUMNS].copy()
    y = df[TARGET_COLUMN].copy()
    years = df["year"].copy()

    return X, y, years


if __name__ == "__main__":
    # Quick manual check: python -m src.preprocess.load_clean
    X, y, years = get_training_data()
    print(f"[load_clean] Loaded {len(X)} rows, {X.shape[1]} features.")
    print(f"[load_clean] Year range: {years.min()}–{years.max()}")
    print(X.head())