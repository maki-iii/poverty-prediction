"""
Merges a newly-released year of actual survey data into the actuals table.

Usage (from the ml/ folder):
    python -m src.pipeline.merge_new_actuals --file data/raw/actuals_2026.xlsx

Once run, the new actual year sits alongside existing years in `actuals`,
ready for the next full pipeline re-run (retrain ML on updated actuals,
forecast the next horizon).
"""

import argparse
from pathlib import Path

import pandas as pd

from src.database.repository.actuals_repo import upsert_year

PROJECT_ROOT = Path(__file__).resolve().parents[2]  # ml/src/pipeline/merge_new_actuals.py -> ml/

# Same column mapping used by seed_from_excel.py -- new data releases are
# expected in the same format as the original dataset.
COLUMN_MAP = {
    "Region": "region",
    "Year": "year",
    "Average Household Income": "avg_household_income",
    "Average Household Expenditure": "avg_household_expenditure",
    "Average Family Size": "avg_family_size",
    "Inflation Rate (%)": "inflation_rate",
    "Poverty Incidence (%)": "poverty_incidence",
}


def load_new_actuals_file(file_path: Path) -> pd.DataFrame:
    df = pd.read_excel(file_path)
    missing = set(COLUMN_MAP.keys()) - set(df.columns)
    if missing:
        raise ValueError(f"File is missing expected columns: {missing}")
    df = df.rename(columns=COLUMN_MAP)
    df = df[list(COLUMN_MAP.values())]
    return df


def merge(file_path: str):
    path = PROJECT_ROOT / file_path if not Path(file_path).is_absolute() else Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {path}")

    df = load_new_actuals_file(path)
    df["source"] = "actual"

    for _, row in df.iterrows():
        record = row.to_dict()
        result = upsert_year(record)
        print(f"[merge_new_actuals] {record['region']} {record['year']}: {result}")

    print(f"\n[merge_new_actuals] Done. {len(df)} year(s) merged into actuals.")
    print("[merge_new_actuals] Next steps: re-run train.py -> evaluate.py -> "
          "forecast_inputs.py -> predict_poverty.py to refresh the full pipeline.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Merge a new year of actual data into actuals.")
    parser.add_argument("--file", required=True, help="Path to the new actuals xlsx file "
                                                        "(relative to ml/ or absolute)")
    args = parser.parse_args()
    merge(args.file)