"""
Interpolates missing actuals data:
    1. Fills NULL poverty_incidence in EXISTING rows (e.g. APIS years
       sitting between two FIES years) using linear interpolation
       between the nearest known (non-null) poverty_incidence values.
    2. Creates entirely NEW rows for years with NO row at all (true gaps),
       linearly interpolating both the indicator columns and
       poverty_incidence from the nearest surrounding known values.

Any row touched by this process gets source = "interpolated".
Only interpolates WITHIN the known year range -- never extrapolates
before the earliest or after the latest known data point.

Usage (from the ml/ folder):
    python -m src.pipeline.interpolation
"""

from pathlib import Path

import pandas as pd
import yaml

from src.database.repository.actuals_repo import get_actuals, upsert_year

PROJECT_ROOT = Path(__file__).resolve().parents[2]  # ml/src/pipeline/interpolation.py -> ml/

with open(PROJECT_ROOT / "configs" / "config.yaml", "r") as f:
    CONFIG = yaml.safe_load(f)

REGION = CONFIG["region"]
FEATURE_COLUMNS = CONFIG["feature_columns"]


def _interpolate_value(target_year: int, known_years: list, known_values: list):
    """
    Linearly interpolates a value for target_year, given sorted parallel
    lists of known years and values. Returns None if target_year falls
    outside the known range (would require extrapolation, not interpolation).
    """
    if target_year in known_years:
        idx = known_years.index(target_year)
        return known_values[idx]

    for i in range(len(known_years) - 1):
        y1, y2 = known_years[i], known_years[i + 1]
        if y1 < target_year < y2:
            v1, v2 = known_values[i], known_values[i + 1]
            frac = (target_year - y1) / (y2 - y1)
            return v1 + (v2 - v1) * frac

    return None  # outside known range


def interpolate_actuals(region: str = None) -> dict:
    """
    Runs the full interpolation pass for a region: fills null
    poverty_incidence in existing rows, and creates new rows for
    completely missing years within the known range.

    Returns a summary dict: {filled_years: [...], created_years: [...], skipped_years: [...]}
    """
    region = region or REGION

    df = get_actuals(region=region)
    if df.empty:
        raise ValueError(f"No actuals found for region='{region}'.")

    df = df.sort_values("year").reset_index(drop=True)
    for col in FEATURE_COLUMNS:
        df[col] = df[col].astype(float)

    years_present = df["year"].tolist()
    min_year, max_year = min(years_present), max(years_present)
    full_range = list(range(min_year, max_year + 1))

    existing_by_year = {row["year"]: row for _, row in df.iterrows()}

    # Known (non-null) poverty_incidence points, for interpolating poverty specifically
    poverty_known = df[df["poverty_incidence"].notna()].sort_values("year")
    poverty_years = poverty_known["year"].tolist()
    poverty_values = poverty_known["poverty_incidence"].astype(float).tolist()

    filled_years = []
    created_years = []
    skipped_years = []

    for year in full_range:
        if year in existing_by_year:
            row = existing_by_year[year]
            if pd.isna(row["poverty_incidence"]):
                val = _interpolate_value(year, poverty_years, poverty_values)
                if val is None:
                    skipped_years.append(year)
                    continue

                upsert_year({
                    "region": region,
                    "year": year,
                    "avg_household_income": float(row["avg_household_income"]),
                    "avg_household_expenditure": float(row["avg_household_expenditure"]),
                    "avg_family_size": float(row["avg_family_size"]),
                    "inflation_rate": float(row["inflation_rate"]),
                    "poverty_incidence": round(float(val), 2),
                    "source": "interpolated",
                })
                filled_years.append(year)

        else:
            # True gap year -- no row exists at all. Interpolate every
            # indicator column, plus poverty_incidence if possible.
            new_row = {"region": region, "year": year, "source": "interpolated"}
            can_build = True

            for col in FEATURE_COLUMNS:
                col_values = df[col].tolist()
                val = _interpolate_value(year, years_present, col_values)
                if val is None:
                    can_build = False
                    break
                new_row[col] = round(float(val), 2)

            if not can_build:
                skipped_years.append(year)
                continue

            poverty_val = _interpolate_value(year, poverty_years, poverty_values)
            new_row["poverty_incidence"] = round(float(poverty_val), 2) if poverty_val is not None else None

            upsert_year(new_row)
            created_years.append(year)

    return {
        "region": region,
        "filled_years": filled_years,
        "created_years": created_years,
        "skipped_years": skipped_years,
    }


if __name__ == "__main__":
    result = interpolate_actuals()
    print(f"[interpolation] Region: {result['region']}")
    print(f"[interpolation] Filled poverty_incidence in existing rows: {result['filled_years']}")
    print(f"[interpolation] Created new interpolated rows: {result['created_years']}")
    print(f"[interpolation] Skipped (outside known range): {result['skipped_years']}")