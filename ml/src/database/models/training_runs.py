"""
TrainingRuns table: permanent history of every training run --
when it happened, which model won, and its metrics. Used to populate
a training history view (and feeds into audit logs).
"""

from sqlalchemy import (
    Column, Integer, String, DECIMAL, Enum, TIMESTAMP, Text, JSON, func
)

from src.database.base import Base


class TrainingRun(Base):
    __tablename__ = "training_runs"

    id = Column(Integer, primary_key=True, autoincrement=True)

    status = Column(
        Enum("completed", "failed", name="training_run_status_enum"),
        nullable=False,
    )

    best_model = Column(String(50), nullable=True)          # e.g. "random_forest"
    selection_metric = Column(String(20), nullable=True)     # e.g. "rmse"

    # Metrics for ALL compared models, stored as JSON:
    # {"xgboost": {"rmse":..., "mae":..., "r2":...}, "ridge": {...}, ...}
    results = Column(JSON, nullable=True)

    prediction_years = Column(String(50), nullable=True)     # e.g. "2024-2026"
    error_message = Column(Text, nullable=True)               # populated if status == 'failed'

    triggered_by = Column(String(100), nullable=True)         # username, if available

    started_at = Column(TIMESTAMP, server_default=func.now())
    finished_at = Column(TIMESTAMP, nullable=True)

    def __repr__(self):
        return f"<TrainingRun id={self.id} status={self.status} best_model={self.best_model}>"