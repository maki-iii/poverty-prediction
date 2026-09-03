"""
Repository for the `uploaded_datasets` table.

This is the ONLY module allowed to write raw queries against
`uploaded_datasets`. The datasets API/service layer calls these
functions instead of touching SQLAlchemy sessions directly.
"""

import pandas as pd

from src.database.base import get_session
from src.database.models.uploaded_datasets import UploadedDataset


def create_upload_record(
    original_filename: str,
    stored_filename: str,
    stored_path: str,
    uploaded_by: str = None,
    region: str = None,
    year_range: str = None,
    row_count: int = None,
) -> int:
    """Creates a 'pending' record for a newly uploaded file. Returns its id."""
    session = get_session()
    try:
        record = UploadedDataset(
            original_filename=original_filename,
            uploaded_by=uploaded_by,
            stored_filename=stored_filename,
            stored_path=stored_path,
            region=region,
            year_range=year_range,
            row_count=row_count,
            status="pending",
        )
        session.add(record)
        session.commit()
        session.refresh(record)
        return record.id
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def list_datasets(status: str = None) -> pd.DataFrame:
    """Lists all uploaded datasets, optionally filtered by status, newest first."""
    session = get_session()
    try:
        query = session.query(UploadedDataset)
        if status:
            query = query.filter(UploadedDataset.status == status)
        query = query.order_by(UploadedDataset.uploaded_at.desc())

        rows = query.all()
        data = [
            {c.name: getattr(row, c.name) for c in UploadedDataset.__table__.columns}
            for row in rows
        ]
        return pd.DataFrame(data)
    finally:
        session.close()


def get_dataset(dataset_id: int) -> dict:
    """Fetches a single dataset record by id. Returns None if not found."""
    session = get_session()
    try:
        record = session.query(UploadedDataset).filter_by(id=dataset_id).first()
        if not record:
            return None
        data = {c.name: getattr(record, c.name) for c in UploadedDataset.__table__.columns}
        # Convert datetime fields to ISO strings for JSON serialization
        for col in ["uploaded_at", "merged_at"]:
            if data.get(col) is not None:
                data[col] = data[col].isoformat()
        return data
    finally:
        session.close()


def mark_merged(dataset_id: int):
    """Updates a dataset's status to 'merged' with a merged_at timestamp."""
    session = get_session()
    try:
        record = session.query(UploadedDataset).filter_by(id=dataset_id).first()
        if not record:
            raise ValueError(f"Dataset id={dataset_id} not found")
        record.status = "merged"
        record.merged_at = pd.Timestamp.now()
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

def mark_processed(dataset_id: int, survey_type: str, region: str, processed_values: dict):
    """
    Updates a dataset's status to 'processed' and stores the computed +
    manually-entered values, ready for review/merge.
    """
    session = get_session()
    try:
        record = session.query(UploadedDataset).filter_by(id=dataset_id).first()
        if not record:
            raise ValueError(f"Dataset id={dataset_id} not found")

        record.status = "processed"
        record.survey_type = survey_type
        record.region = region
        record.processed_year = processed_values.get("year")
        record.processed_avg_household_income = processed_values.get("avg_household_income")
        record.processed_avg_household_expenditure = processed_values.get("avg_household_expenditure")
        record.processed_avg_family_size = processed_values.get("avg_family_size")
        record.processed_inflation_rate = processed_values.get("inflation_rate")
        record.processed_poverty_incidence = processed_values.get("poverty_incidence")

        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

def mark_failed(dataset_id: int, error_message: str):
    """Updates a dataset's status to 'failed' with an error message."""
    session = get_session()
    try:
        record = session.query(UploadedDataset).filter_by(id=dataset_id).first()
        if not record:
            raise ValueError(f"Dataset id={dataset_id} not found")
        record.status = "failed"
        record.error_message = error_message
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def delete_dataset(dataset_id: int) -> bool:
    """Deletes a dataset record (e.g. a pending upload the user doesn't want). Returns True if deleted."""
    session = get_session()
    try:
        record = session.query(UploadedDataset).filter_by(id=dataset_id).first()
        if not record:
            return False
        session.delete(record)
        session.commit()
        return True
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()