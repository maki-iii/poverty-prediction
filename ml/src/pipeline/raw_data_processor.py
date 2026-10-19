"""Weighted FIES family indicators below an annual per-capita poverty threshold.

The user supplies the year, threshold and official family poverty incidence.
The target is never recomputed from this filtered group.
"""

import sys
import math
from pathlib import Path

import pandas as pd
import yaml
import numpy as np
from src.pipeline import processing_status
from src.pipeline.indicator_basis import INDICATOR_BASIS

PROJECT_ROOT = Path(__file__).resolve().parents[2]  # ml/src/pipeline/raw_data_processor.py -> ml/

with open(PROJECT_ROOT / "configs" / "survey_mappings.yaml", "r") as f:
    SURVEY_MAPPINGS = yaml.safe_load(f)


def _resolve_column(df: pd.DataFrame, aliases: list, field_name: str) -> str:
    """Returns the first alias that actually exists as a column in df, or raises."""
    for alias in aliases:
        if alias in df.columns:
            return alias
    raise ValueError(
        f"Could not find a column for '{field_name}'. "
        f"Tried aliases: {aliases}. Available columns include a sample: "
        f"{list(df.columns[:20])}..."
    )


def _clean_numeric(series: pd.Series) -> pd.Series:
    """Coerces a column to numeric, turning blanks/invalid entries into NaN."""
    return pd.to_numeric(series.astype(str).str.strip(), errors="coerce")


def process_raw_survey(file_path: Path, survey_type: str, poverty_threshold: float, dataset_id: int = None) -> dict:
    """Use the same below-threshold families and family weights for all three means."""
    if survey_type != "fies":
        raise ValueError("Only FIES datasets are supported.")
    if not math.isfinite(poverty_threshold) or poverty_threshold <= 0:
        raise ValueError("Poverty threshold must be positive annual pesos per person.")
    if survey_type not in SURVEY_MAPPINGS:
        raise ValueError(
            f"Unknown survey_type '{survey_type}'. "
            f"Available types: {list(SURVEY_MAPPINGS.keys())}"
        )
    mapping = SURVEY_MAPPINGS[survey_type]

    if dataset_id is not None:
        processing_status.update(dataset_id, "reading_file", 10, "Reading raw survey file...")
    is_excel = Path(file_path).suffix.lower() in (".xlsx", ".xls")
    df = pd.read_excel(file_path, nrows=0) if is_excel else pd.read_csv(file_path, nrows=0)
    df.columns = df.columns.str.strip()

    if dataset_id is not None:
        processing_status.update(dataset_id, "resolving_columns", 25, "Resolving column mappings...")

    # --- Resolve column names via aliases ---
    income_col = _resolve_column(df, mapping["income_col"], "income")
    expenditure_col = _resolve_column(df, mapping["expenditure_col"], "expenditure")
    family_size_col = _resolve_column(df, mapping["family_size_col"], "family_size")
    region_col = _resolve_column(df, mapping["region_col"], "region")
    weight_col = _resolve_column(df, mapping["weight_col"], "survey weight")
    wanted = {income_col, expenditure_col, family_size_col, region_col, weight_col}
    # Read only the five needed columns, even in very large microdata files.
    select = lambda name: str(name).strip() in wanted
    df = (pd.read_excel(file_path, usecols=select) if is_excel
          else pd.read_csv(file_path, usecols=select, low_memory=False))
    df.columns = df.columns.str.strip()

    if dataset_id is not None:
        processing_status.update(dataset_id, "filtering_region", 40, "Filtering to target region...")

    # --- Filter to target region(s) ---
    region_code_map = mapping["region_code_map"]
    region_codes = _clean_numeric(df[region_col])
    target_codes = list(region_code_map.keys())
    df_filtered = df[region_codes.isin(target_codes)].copy()

    if df_filtered.empty:
        raise ValueError(
            f"No rows found matching region code(s) {target_codes} "
            f"in column '{region_col}'."
        )

    matched_code = int(_clean_numeric(df_filtered[region_col]).iloc[0])
    region_name = region_code_map[matched_code]

    if dataset_id is not None:
        processing_status.update(dataset_id, "computing_income", 70, "Computing income & expenditure...")

    # Classify using annual income PER PERSON, not total family income.
    income = _clean_numeric(df_filtered[income_col])
    expenditure = _clean_numeric(df_filtered[expenditure_col])
    family_size = _clean_numeric(df_filtered[family_size_col])
    weights = _clean_numeric(df_filtered[weight_col])
    valid = (np.isfinite(income) & np.isfinite(expenditure) & np.isfinite(family_size)
             & np.isfinite(weights) & (family_size > 0) & (weights > 0) & (expenditure >= 0))
    if not valid.all():
        raise ValueError(f"{int((~valid).sum())} NCR rows have invalid income, expenditure, family size, or survey weight. Correct them before processing.")
    poor = income / family_size < poverty_threshold
    if not poor.any():
        raise ValueError("No NCR families are below this annual per-person poverty threshold. Check its year and units.")
    poor_weights = weights[poor]
    def weighted_mean(values):
        return float(np.average(values[poor], weights=poor_weights))
    avg_household_income = weighted_mean(income)
    avg_household_expenditure = weighted_mean(expenditure)
    avg_family_size = weighted_mean(family_size)

    if dataset_id is not None:
        processing_status.update(dataset_id, "finalizing", 95, "Finalizing results...")

    return {
        "region": region_name,
        "row_count_used": int(poor.sum()),
        "poverty_threshold": float(poverty_threshold),
        "indicator_basis": INDICATOR_BASIS,
        "avg_household_income": avg_household_income,
        "avg_household_expenditure": avg_household_expenditure,
        "avg_family_size": avg_family_size,
    }


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python -m src.pipeline.raw_data_processor <file_path> fies <annual_per_person_threshold>")
        sys.exit(1)

    file_path = Path(sys.argv[1])
    survey_type = sys.argv[2]

    result = process_raw_survey(file_path, survey_type, float(sys.argv[3]))
    print("\n[raw_data_processor] Computed indicators:")
    for key, value in result.items():
        print(f"  {key}: {value}")
