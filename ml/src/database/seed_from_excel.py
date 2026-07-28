"""
One-time (or re-runnable) loader: reads data/raw/ncr_master_dataset.xlsx
and inserts its rows into the `actuals` table.

Safe to re-run: skips years already present in the DB instead of
inserting duplicates.

Usage (from the ml/ folder):
    python -m src.database.seed_from_excel
"""

from pathlib import Path

import pandas as pd

from src.database.repository.actuals_repo import insert_actuals, get_years_present

PROJECT_ROOT = Path(__file__).resolve().parents[2]  # ml/src/database/seed_from_excel.py -> ml/
EXCEL_PATH = PROJECT_ROOT / "data" / "raw" / "ncr_master_dataset.xlsx"

# Maps xlsx column names -> actuals table column names
COLUMN_MAP = {
    "Region": "region",
    "Year": "year",
    "Average Household Income": "avg_household_income",
    "Average Household Expenditure": "avg_household_expenditure",
    "Average Family Size": "avg_family_size",
    "Employment Rate (%)": "employment_rate",
    "Average Educational Attainment (Years)": "avg_educational_attainment",
    "Home Ownership (%)": "home_ownership_pct",
    "Electricity Access (%)": "electricity_access_pct",
    "Safe Water Access (%)": "safe_water_access_pct",
    "Sanitary Toilet Access (%)": "sanitary_toilet_access_pct",
    "Refrigerator Ownership (%)": "refrigerator_ownership_pct",
    "Vehicle Ownership (%)": "vehicle_ownership_pct",
    "Inflation Rate (%)": "inflation_rate",
    "Poverty Incidence (%)": "poverty_incidence",
}


def load_excel() -> pd.DataFrame:
    df = pd.read_excel(EXCEL_PATH, sheet_name="Mock Dataset")
    missing = set(COLUMN_MAP.keys()) - set(df.columns)
    if missing:
        raise ValueError(f"Excel file is missing expected columns: {missing}")
    df = df.rename(columns=COLUMN_MAP)
    df = df[list(COLUMN_MAP.values())]
    return df


def seed():
    df = load_excel()
    existing_years = set(get_years_present(region=None))

    new_rows = df[~df["year"].isin(existing_years)].copy()
    if new_rows.empty:
        print("[seed] No new rows to insert -- all years already in DB.")
        return

    new_rows["source"] = "seed"
    records = new_rows.to_dict(orient="records")

    inserted = insert_actuals(records)
    print(f"[seed] Inserted {inserted} rows for years: "
          f"{sorted(new_rows['year'].tolist())}")


if __name__ == "__main__":
    seed()