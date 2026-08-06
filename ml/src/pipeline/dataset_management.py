"""
Business logic for the Dataset Management feature.

Flow: upload (save file, minimal metadata) -> process (parse raw survey,
compute 5 fields, combine with manual inputs) -> merge (write to actuals).
"""

import uuid
from pathlib import Path

import pandas as pd

from src.database.repository.datasets_repo import (
    create_upload_record,
    list_datasets,
    get_dataset,
    mark_processed,
    mark_merged,
    mark_failed,
    delete_dataset,
)
from src.database.repository.actuals_repo import upsert_year
from src.pipeline.raw_data_processor import process_raw_survey
import threading
from src.pipeline import processing_status

PROJECT_ROOT = Path(__file__).resolve().parents[2]  # ml/src/pipeline/dataset_management.py -> ml/
UPLOAD_DIR = PROJECT_ROOT / "data" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def save_uploaded_file(file_bytes: bytes, original_filename: str, uploaded_by: str = None) -> dict:
    """
    Saves an uploaded raw survey file to disk and creates a 'pending' record.
    No parsing happens here -- raw survey files need a survey_type before
    they can be parsed (see process_dataset).
    """
    ext = Path(original_filename).suffix or ".csv"
    stored_filename = f"{uuid.uuid4().hex}{ext}"
    stored_path = UPLOAD_DIR / stored_filename

    with open(stored_path, "wb") as f:
        f.write(file_bytes)

    dataset_id = create_upload_record(
        original_filename=original_filename,
        uploaded_by=uploaded_by,
        stored_filename=stored_filename,
        stored_path=str(stored_path.relative_to(PROJECT_ROOT)),
    )
    return get_dataset(dataset_id)


def get_datasets(status: str = None) -> list:
    """Returns list of dataset records as dicts, for the API to serialize."""
    df = list_datasets(status=status)
    if df.empty:
        return []
    for col in ["uploaded_at", "merged_at"]:
        if col in df.columns:
            df[col] = df[col].apply(lambda x: x.isoformat() if pd.notnull(x) else None)
    return df.to_dict(orient="records")


def _process_dataset_background(dataset_id, survey_type, year, inflation_rate, poverty_incidence):
    try:
        record = get_dataset(dataset_id)
        if record is None:
            raise ValueError(f"Dataset id={dataset_id} not found")
        if record["status"] not in ("pending", "failed"):
            raise ValueError(
                f"Dataset id={dataset_id} has status '{record['status']}' -- "
                f"only 'pending' or 'failed' datasets can be processed."
            )

        file_path = PROJECT_ROOT / record["stored_path"]
        if not file_path.exists():
            mark_failed(dataset_id, "Stored file no longer exists on disk")
            raise FileNotFoundError(f"File not found: {file_path}")

        computed = process_raw_survey(file_path, survey_type, dataset_id=dataset_id)

        processed_values = {
            "year": year,
            "avg_household_income": computed["avg_household_income"],
            "avg_household_expenditure": computed["avg_household_expenditure"],
            "avg_family_size": computed["avg_family_size"],
            "employment_rate": computed["employment_rate"],
            "avg_educational_attainment": computed["avg_educational_attainment"],
            "inflation_rate": inflation_rate,
            "poverty_incidence": poverty_incidence,
        }

        mark_processed(dataset_id, survey_type, computed["region"], processed_values)
        processing_status.complete(dataset_id)

    except Exception as e:
        mark_failed(dataset_id, str(e))
        processing_status.fail(dataset_id, e)


def start_processing(dataset_id: int, survey_type: str, year: int,
                      inflation_rate: float, poverty_incidence: float):
    """
    Kicks off processing in a background thread. Returns immediately;
    poll processing_status.get_status(dataset_id) for progress.
    """
    if processing_status.is_running(dataset_id):
        raise ValueError(f"Dataset id={dataset_id} is already being processed.")

    processing_status.reset(dataset_id)

    thread = threading.Thread(
        target=_process_dataset_background,
        args=(dataset_id, survey_type, year, inflation_rate, poverty_incidence),
        daemon=True,
    )
    thread.start()


def merge_dataset(dataset_id: int) -> dict:
    """
    Merges a processed dataset's values into `actuals`.
    """
    record = get_dataset(dataset_id)
    if record is None:
        raise ValueError(f"Dataset id={dataset_id} not found")
    if record["status"] != "processed":
        raise ValueError(
            f"Dataset id={dataset_id} has status '{record['status']}' -- "
            f"only 'processed' datasets can be merged."
        )

    try:
        actuals_row = {
            "region": record["region"],
            "year": int(record["processed_year"]),
            "avg_household_income": record["processed_avg_household_income"],
            "avg_household_expenditure": record["processed_avg_household_expenditure"],
            "avg_family_size": record["processed_avg_family_size"],
            "employment_rate": record["processed_employment_rate"],
            "avg_educational_attainment": record["processed_avg_educational_attainment"],
            "inflation_rate": record["processed_inflation_rate"],
            "poverty_incidence": record["processed_poverty_incidence"],
            "source": "actual",
        }

        outcome = upsert_year(actuals_row)
        mark_merged(dataset_id)

        return {
            "dataset_id": dataset_id,
            "filename": record["original_filename"],
            "rows_merged": 1,
            "details": [{"year": actuals_row["year"], "result": outcome}],
        }
    except Exception as e:
        mark_failed(dataset_id, str(e))
        raise


def remove_dataset(dataset_id: int) -> dict:
    """Deletes a dataset record and its file from disk. Returns dict with filename, or None if not found."""
    record = get_dataset(dataset_id)
    if record is None:
        return None

    file_path = PROJECT_ROOT / record["stored_path"]
    if file_path.exists():
        file_path.unlink()

    deleted = delete_dataset(dataset_id)
    if not deleted:
        return None

    return {"filename": record["original_filename"]}