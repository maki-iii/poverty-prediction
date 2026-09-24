"""Separate histories for indicator forecasting and supervised poverty regression.

Forecasting: actual + interpolated + retained forecast indicators, by year.
Regression: actual + interpolated rows with targets, never forecast/prediction tables.
"""
from pathlib import Path
import numpy as np
import pandas as pd
import yaml
from src.database.repository.actuals_repo import get_actuals
from src.database.repository.forecasts_repo import get_forecasts
from src.pipeline.year_selection import historical_rows, latest_by_year, latest_history_year

PROJECT_ROOT = Path(__file__).resolve().parents[2]
CONFIG = yaml.safe_load((PROJECT_ROOT / "configs/config.yaml").read_text())
REGION = CONFIG["region"]
TARGET_COLUMN = CONFIG["target_column"]
FEATURE_COLUMNS = CONFIG["feature_columns"]


def load_actuals(region=None):
    df = get_actuals(region=region or REGION)
    if df.empty:
        raise ValueError(f"No actuals found for region='{region or REGION}'.")
    return df


def _validate_common(df, required_columns):
    missing = required_columns - set(df.columns)
    if missing:
        raise ValueError(f"Missing expected columns: {missing}")
    if df.empty:
        raise ValueError("No eligible actual or interpolated history is available.")
    if df.duplicated(["region", "year"]).any():
        raise ValueError("Duplicate (region, year) rows found.")
    return df.sort_values("year").reset_index(drop=True)


def _validate_features(df):
    df = _validate_common(df, set(FEATURE_COLUMNS + ["year", "region"]))
    df[FEATURE_COLUMNS] = df[FEATURE_COLUMNS].astype(float)
    if not np.isfinite(df[FEATURE_COLUMNS].to_numpy()).all():
        raise ValueError("Indicators must contain only finite numeric values.")
    return df


def get_forecast_history(region=None, include_forecasts=True):
    """Newest forecast per missing year, with actual/interpolated history taking priority.

    This reads stored estimates without copying them into the actuals table.
    include_forecasts=False is for backtesting, where present-day forecast batches
    must not be used as if they had existed at a historical validation origin.
    """
    region = region or REGION
    history = historical_rows(load_actuals(region))
    anchor = latest_history_year(history)
    history = _validate_features(history.loc[history["year"] <= anchor])
    columns = ["region", "year", *FEATURE_COLUMNS, "source"]
    if "source" not in history:
        history["source"] = "actual"
    history = history[columns].copy()
    if include_forecasts:
        retained = latest_by_year(get_forecasts(region=region), history)
        if not retained.empty:
            # Only fill historical gaps. Prior future forecasts cannot move the anchor.
            retained = retained.loc[retained["year"] <= anchor].copy()
            retained["source"] = "forecast"
            history = pd.concat([history, retained[columns]], ignore_index=True)
    return _validate_features(history)


def get_forecast_input_data(region=None, include_forecasts=True):
    df = get_forecast_history(region, include_forecasts=include_forecasts)
    return df[FEATURE_COLUMNS].copy(), df["year"].copy()


def get_training_frame(region=None):
    """Read ONLY actuals: measured and interpolated targets are both eligible."""
    df = historical_rows(load_actuals(region))
    df = _validate_common(df, set(FEATURE_COLUMNS + [TARGET_COLUMN, "year", "region"]))
    df = df[df[TARGET_COLUMN].notna()].reset_index(drop=True)
    if df.empty:
        raise ValueError(f"No actual/interpolated rows with a non-null '{TARGET_COLUMN}'.")
    df = _validate_features(df)
    df[TARGET_COLUMN] = df[TARGET_COLUMN].astype(float)
    if not np.isfinite(df[TARGET_COLUMN]).all() or not df[TARGET_COLUMN].between(0, 100).all():
        raise ValueError("Poverty incidence must be finite and between 0 and 100.")
    if "source" not in df:
        df["source"] = "actual"
    return df


def get_training_data(region=None):
    df = get_training_frame(region)
    return df[FEATURE_COLUMNS].copy(), df[TARGET_COLUMN].copy(), df["year"].copy()


if __name__ == "__main__":
    X_fc, years_fc = get_forecast_input_data()
    X_tr, y_tr, years_tr = get_training_data()
    print(f"Forecast history: {len(X_fc)} rows, {years_fc.min()}-{years_fc.max()}")
    print(f"Actual + interpolated ML history: {len(X_tr)} rows, {years_tr.min()}-{years_tr.max()}")
