"""Data preparation for regional poverty prediction.

The functions in this module accept either household-level mock data or a
future region-year dataset. Real datasets can replace the mock file as long as
they contain at least region and year columns, plus either a poverty incidence
column or a household poverty label that can be aggregated.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import numpy as np
import pandas as pd


REGION_COL = "region"
YEAR_COL = "year"
TARGET_COL = "poverty_incidence"


@dataclass(frozen=True)
class DatasetSchema:
    region_col: str = REGION_COL
    year_col: str = YEAR_COL
    target_col: str = TARGET_COL
    household_poverty_col: str = "is_poor"


EDUCATION_SCORE = {
    "No Grade Completed": 0,
    "Elementary Undergraduate": 1,
    "Elementary Graduate": 2,
    "High School Undergraduate": 3,
    "High School Graduate": 4,
    "College Undergraduate": 5,
    "College Graduate": 6,
    "Post Graduate": 7,
}


def load_dataset(path: str | Path) -> pd.DataFrame:
    """Load a CSV dataset and normalize column names."""
    df = pd.read_csv(path)
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    validate_dataset(df)
    return df


def validate_dataset(df: pd.DataFrame, schema: DatasetSchema = DatasetSchema()) -> None:
    """Validate the minimum columns needed before preprocessing."""
    missing_base = {schema.region_col, schema.year_col} - set(df.columns)
    if missing_base:
        raise ValueError(
            "Dataset is missing required column(s): "
            f"{sorted(missing_base)}. Required base columns are "
            f"'{schema.region_col}' and '{schema.year_col}'."
        )

    has_region_year_target = schema.target_col in df.columns
    has_household_target = schema.household_poverty_col in df.columns
    if not has_region_year_target and not has_household_target:
        raise ValueError(
            "Dataset must contain either "
            f"'{schema.target_col}' for region-year data or "
            f"'{schema.household_poverty_col}' for household-level data."
        )

    if has_region_year_target:
        numeric_indicators = [
            col
            for col in df.select_dtypes(include=[np.number]).columns
            if col not in {schema.year_col, schema.target_col}
        ]
        if not numeric_indicators:
            raise ValueError(
                "Region-year data must include at least one numeric socioeconomic "
                "indicator column besides year and poverty_incidence."
            )


def generate_mock_region_year_data(
    regions: Iterable[str] | None = None,
    start_year: int = 2010,
    end_year: int = 2025,
    seed: int = 42,
) -> pd.DataFrame:
    """Create realistic region-year mock data when no raw file is available."""
    rng = np.random.default_rng(seed)
    regions = list(regions or ["NCR", "CAR", "Region I", "Region II", "Region III"])
    rows: list[dict[str, float | int | str]] = []

    for idx, region in enumerate(regions):
        base_poverty = rng.uniform(15, 38) + idx * 0.7
        income_base = rng.uniform(120_000, 230_000)
        grdp_base = rng.uniform(180, 680)
        literacy_base = rng.uniform(82, 96)
        service_base = rng.uniform(55, 90)

        for offset, year in enumerate(range(start_year, end_year + 1)):
            employment_rate = np.clip(rng.normal(89 + offset * 0.12, 2.5), 75, 98)
            unemployment_rate = 100 - employment_rate
            inflation_rate = np.clip(rng.normal(4.2, 1.4), 0.5, 9.5)
            literacy_rate = np.clip(literacy_base + offset * 0.35 + rng.normal(0, 0.8), 70, 99)
            access_to_basic_services = np.clip(service_base + offset * 0.75 + rng.normal(0, 1.8), 35, 99)
            population_growth = np.clip(rng.normal(1.35 - offset * 0.015, 0.35), -0.5, 3.2)
            household_income = income_base * (1 + 0.035 * offset) + rng.normal(0, 8500)
            grdp = grdp_base * (1 + 0.045 * offset) + rng.normal(0, 25)
            education_level = np.clip((literacy_rate - 70) / 5 + rng.normal(0, 0.4), 1, 7)
            health_index = np.clip(55 + access_to_basic_services * 0.3 + offset * 0.2 + rng.normal(0, 2), 40, 98)

            poverty_incidence = (
                base_poverty
                - 0.12 * (employment_rate - 85)
                + 0.24 * unemployment_rate
                + 0.32 * inflation_rate
                - 0.000035 * household_income
                - 0.018 * grdp
                - 0.13 * literacy_rate
                - 0.08 * access_to_basic_services
                - 0.05 * health_index
                + 0.10 * population_growth
                + rng.normal(0, 1.3)
            )
            poverty_incidence = float(np.clip(poverty_incidence, 2, 65))

            rows.append(
                {
                    REGION_COL: region,
                    YEAR_COL: year,
                    TARGET_COL: poverty_incidence,
                    "employment_rate": employment_rate,
                    "unemployment_rate": unemployment_rate,
                    "inflation_rate": inflation_rate,
                    "literacy_rate": literacy_rate,
                    "population_growth": population_growth,
                    "grdp": grdp,
                    "household_income": household_income,
                    "education_level": education_level,
                    "health_index": health_index,
                    "access_to_basic_services": access_to_basic_services,
                }
            )

    return pd.DataFrame(rows)


def to_region_year(df: pd.DataFrame, schema: DatasetSchema = DatasetSchema()) -> pd.DataFrame:
    """Convert household-level or region-year records into model-ready rows."""
    validate_dataset(df, schema)
    if schema.target_col in df.columns:
        region_year = df.copy()
    elif schema.household_poverty_col in df.columns:
        region_year = _aggregate_household_data(df, schema)
    else:
        raise ValueError(
            "Dataset must contain either a poverty_incidence column or an is_poor "
            "household poverty label for aggregation."
        )

    region_year = region_year.sort_values([schema.region_col, schema.year_col]).reset_index(drop=True)
    numeric_cols = region_year.select_dtypes(include=[np.number]).columns
    region_year[numeric_cols] = region_year[numeric_cols].replace([np.inf, -np.inf], np.nan)
    region_year[numeric_cols] = region_year.groupby(schema.region_col)[numeric_cols].transform(
        lambda s: s.interpolate(limit_direction="both")
    )
    return region_year.dropna(subset=[schema.target_col])


def _aggregate_household_data(df: pd.DataFrame, schema: DatasetSchema) -> pd.DataFrame:
    required = {schema.region_col, schema.year_col, schema.household_poverty_col}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Missing required columns: {sorted(missing)}")

    work = df.copy()
    work["education_score"] = work.get("head_education", pd.Series(index=work.index, dtype=object)).map(
        EDUCATION_SCORE
    )
    work["safe_water"] = ~work.get("water_source", "").astype(str).str.contains("unsafe|river|rain", case=False)
    work["safe_toilet"] = ~work.get("toilet_type", "").astype(str).str.contains("none|open", case=False)
    work["durable_wall"] = work.get("wall_type", "").astype(str).str.contains("concrete|brick|stone", case=False)

    grouped = work.groupby([schema.region_col, schema.year_col], as_index=False)
    region_year = grouped.agg(
        poverty_incidence=(schema.household_poverty_col, lambda s: s.mean() * 100),
        employment_rate=("head_employed", lambda s: s.mean() * 100),
        household_income=("total_household_income", "mean"),
        wages_salaries=("wages_salaries", "mean"),
        agricultural_income=("agricultural_income", "mean"),
        remittance_amount=("remittance_amount", "mean"),
        total_expenditure=("total_expenditure", "mean"),
        food_expenditure=("food_expenditure", "mean"),
        family_size=("family_size", "mean"),
        per_capita_income=("per_capita_income", "mean"),
        education_level=("education_score", "mean"),
        urban_share=("is_urban", lambda s: s.mean() * 100),
        access_to_electricity=("has_electricity", lambda s: s.mean() * 100),
        credit_access=("has_credit_access", lambda s: s.mean() * 100),
        safe_water_access=("safe_water", lambda s: s.mean() * 100),
        safe_toilet_access=("safe_toilet", lambda s: s.mean() * 100),
        durable_wall_share=("durable_wall", lambda s: s.mean() * 100),
        households=("hh_id", "count"),
    )

    region_year["unemployment_rate"] = 100 - region_year["employment_rate"]
    region_year["literacy_rate"] = (region_year["education_level"].fillna(0) / 7 * 100).clip(0, 100)
    region_year["access_to_basic_services"] = region_year[
        ["access_to_electricity", "safe_water_access", "safe_toilet_access"]
    ].mean(axis=1)
    region_year["health_index"] = (region_year["safe_toilet_access"] * 0.5 + region_year["safe_water_access"] * 0.5)
    region_year["grdp"] = region_year["household_income"] * region_year["households"] / 1_000_000

    region_year = region_year.sort_values([schema.region_col, schema.year_col])
    region_year["population_proxy"] = region_year["households"] * region_year["family_size"]
    region_year["population_growth"] = (
        region_year.groupby(schema.region_col)["population_proxy"].pct_change() * 100
    ).fillna(0)
    region_year["inflation_rate"] = (
        region_year.groupby(schema.region_col)["total_expenditure"].pct_change() * 100
    ).replace([np.inf, -np.inf], np.nan)
    region_year["inflation_rate"] = region_year["inflation_rate"].fillna(
        region_year["inflation_rate"].median()
    )

    return region_year


def create_lag_features(
    region_year: pd.DataFrame,
    lags: Iterable[int] = (1, 2),
    target_col: str = TARGET_COL,
    region_col: str = REGION_COL,
    year_col: str = YEAR_COL,
) -> tuple[pd.DataFrame, list[str]]:
    """Create dynamic lag features for all numeric indicators and the target."""
    lags = sorted(set(int(lag) for lag in lags if int(lag) > 0))
    base = region_year.sort_values([region_col, year_col]).copy()
    numeric_cols = [
        c for c in base.select_dtypes(include=[np.number]).columns if c not in {year_col}
    ]

    feature_cols: list[str] = []
    for lag in lags:
        shifted = base.groupby(region_col)[numeric_cols].shift(lag)
        shifted.columns = [f"{col}_lag_{lag}" for col in shifted.columns]
        base = pd.concat([base, shifted], axis=1)
        feature_cols.extend(shifted.columns.tolist())

    modeled = base.dropna(subset=feature_cols + [target_col]).reset_index(drop=True)
    return modeled, feature_cols


def chronological_train_test_split(
    modeled: pd.DataFrame,
    test_years: int = 3,
    year_col: str = YEAR_COL,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Split by year so evaluation simulates forecasting later periods."""
    years = sorted(modeled[year_col].unique())
    if len(years) <= test_years:
        test_years = max(1, len(years) // 4)
    cutoff_years = set(years[-test_years:])
    train_df = modeled[~modeled[year_col].isin(cutoff_years)].copy()
    test_df = modeled[modeled[year_col].isin(cutoff_years)].copy()
    return train_df, test_df
