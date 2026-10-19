"""
UploadedDatasets table: tracks every file a user uploads through the
Dataset Management page, before and after it's merged into `actuals`.

Upload != Merge. Uploading just stores the file and creates a 'pending'
record. Merging is a separate, explicit action that actually writes
rows into `actuals`.
"""

from sqlalchemy import (
    Column, Integer, String, DECIMAL, Enum, TIMESTAMP, Text, func
)

from src.database.base import Base


class UploadedDataset(Base):
    __tablename__ = "uploaded_datasets"

    id = Column(Integer, primary_key=True, autoincrement=True)

    original_filename = Column(String(255), nullable=False)
    uploaded_by = Column(String(100), nullable=True)   # name/username of who uploaded it
    stored_filename = Column(String(255), nullable=False)   # actual filename on disk (avoids collisions)
    stored_path = Column(String(500), nullable=False)       # full path relative to project root

    region = Column(String(50), nullable=True)               # detected from file, if available
    year_range = Column(String(50), nullable=True)            # e.g. "2024-2024" or "2024-2026"
    row_count = Column(Integer, nullable=True)
    survey_type = Column(String(50), nullable=True)   # e.g. "apis", "fies"

    # Populated after processing (auto-computed + manually entered fields)
    processed_year = Column(Integer, nullable=True)
    processed_avg_household_income = Column(DECIMAL(12, 2), nullable=True)
    processed_avg_household_expenditure = Column(DECIMAL(12, 2), nullable=True)
    processed_avg_family_size = Column(DECIMAL(4, 2), nullable=True)
    processed_inflation_rate = Column(DECIMAL(5, 2), nullable=True)
    processed_poverty_incidence = Column(DECIMAL(5, 2), nullable=True)
    processed_poverty_threshold = Column(DECIMAL(12, 2), nullable=True)
    indicator_basis = Column(String(50), nullable=True)

    status = Column(
        Enum("pending", "processed", "merged", "failed", name="dataset_status_enum"),
        nullable=False,
        default="pending",
    )
    error_message = Column(Text, nullable=True)   # populated if status == 'failed'

    uploaded_at = Column(TIMESTAMP, server_default=func.now())
    merged_at = Column(TIMESTAMP, nullable=True)

    def __repr__(self):
        return (
            f"<UploadedDataset id={self.id} filename={self.original_filename} "
            f"status={self.status}>"
        )
