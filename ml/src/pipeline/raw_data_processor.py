"""
Generic raw survey microdata processor. Takes a household-level survey
file (APIS, FIES, etc.) and a survey_type, resolves the correct column
names via configs/survey_mappings.yaml, filters to the target region,
and computes the 5 auto-derivable indicators:
    - avg_household_income
    - avg_household_expenditure
    - avg_family_size
    - employment_rate (%)
    - avg_educational_attainment (% college graduate or higher)

year, inflation_rate, and poverty_incidence are NOT computed here --
they're supplied manually by the user during the Process step.

Usage: imported by src/pipeline/dataset_management.py -- not run directly,
but can be tested standalone:
    python -m src.pipeline.raw_data_processor <file_path> <survey_type>
"""

import sys
from pathlib import Path

import pandas as pd
import yaml
from src.pipeline import processing_status

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


def process_raw_survey(file_path: Path, survey_type: str, dataset_id: int = None) -> dict:
    """
    Loads a raw survey file, filters to the target region (NCR), and
    computes the 5 auto-derivable indicators.

    Returns a dict with: region, row_count_used, avg_household_income,
    avg_household_expenditure, avg_family_size, employment_rate,
    avg_educational_attainment.
    """
    if survey_type not in SURVEY_MAPPINGS:
        raise ValueError(
            f"Unknown survey_type '{survey_type}'. "
            f"Available types: {list(SURVEY_MAPPINGS.keys())}"
        )
    mapping = SURVEY_MAPPINGS[survey_type]

    if dataset_id is not None:
        processing_status.update(dataset_id, "reading_file", 10, "Reading raw survey file...")
    df = pd.read_csv(file_path, low_memory=False)

    if dataset_id is not None:
        processing_status.update(dataset_id, "resolving_columns", 25, "Resolving column mappings...")

    # --- Resolve column names via aliases ---
    income_col = _resolve_column(df, mapping["income_col"], "income")
    expenditure_col = _resolve_column(df, mapping["expenditure_col"], "expenditure")
    family_size_col = _resolve_column(df, mapping["family_size_col"], "family_size")
    employment_col = _resolve_column(df, mapping["employment_col"], "employment")
    education_col = _resolve_column(df, mapping["education_col"], "education")
    region_col = _resolve_column(df, mapping["region_col"], "region")

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
        processing_status.update(dataset_id, "computing_income", 55, "Computing income & expenditure...")

    # --- Compute averages ---
    income = _clean_numeric(df_filtered[income_col])
    expenditure = _clean_numeric(df_filtered[expenditure_col])
    family_size = _clean_numeric(df_filtered[family_size_col])

    avg_household_income = round(float(income.mean()), 2)
    avg_household_expenditure = round(float(expenditure.mean()), 2)
    avg_family_size = round(float(family_size.mean()), 2)

    if dataset_id is not None:
        processing_status.update(dataset_id, "computing_employment", 70, "Computing employment rate...")

    # --- Employment rate ---
    emp_raw = df_filtered[employment_col].astype(str).str.strip()
    emp_valid = emp_raw[emp_raw != ""]
    yes_code = str(mapping["employment_yes_code"]).strip()
    employment_rate = round(float((emp_valid == yes_code).mean() * 100), 2) if len(emp_valid) > 0 else None

    if dataset_id is not None:
        processing_status.update(dataset_id, "computing_education", 85, "Computing educational attainment...")

    # --- Educational attainment ---
    edu_numeric = _clean_numeric(df_filtered[education_col])
    edu_valid = edu_numeric.dropna()
    college_codes = mapping["college_graduate_codes"]
    avg_educational_attainment = (
        round(float(edu_valid.isin(college_codes).mean() * 100), 2) if len(edu_valid) > 0 else None
    )

    if dataset_id is not None:
        processing_status.update(dataset_id, "finalizing", 95, "Finalizing results...")

    return {
        "region": region_name,
        "row_count_used": len(df_filtered),
        "avg_household_income": avg_household_income,
        "avg_household_expenditure": avg_household_expenditure,
        "avg_family_size": avg_family_size,
        "employment_rate": employment_rate,
        "avg_educational_attainment": avg_educational_attainment,
    }


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python -m src.pipeline.raw_data_processor <file_path> <survey_type>")
        sys.exit(1)

    file_path = Path(sys.argv[1])
    survey_type = sys.argv[2]

    result = process_raw_survey(file_path, survey_type)
    print("\n[raw_data_processor] Computed indicators:")
    for key, value in result.items():
        print(f"  {key}: {value}")