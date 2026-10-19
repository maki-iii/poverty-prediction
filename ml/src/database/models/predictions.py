"""
PovertyPredictions table: ML-predicted poverty incidence, applied to
forecasted (or actual, for backtesting) input indicators.
"""

from sqlalchemy import (
    Column, Integer, String, DECIMAL, Enum, TIMESTAMP, UniqueConstraint, func
)

from src.database.base import Base


class PovertyPrediction(Base):
    __tablename__ = "predictions"
    indicator_basis = Column(String(50), nullable=True)

    id = Column(Integer, primary_key=True, autoincrement=True)
    region = Column(String(50), nullable=False)
    year = Column(Integer, nullable=False)

    predicted_poverty_incidence = Column(DECIMAL(5, 2), nullable=False)
    model_used = Column(String(50), nullable=False)  # 'xgboost' | 'ridge' | 'random_forest'

    input_source = Column(
        Enum("forecast", "actual", name="input_source_enum"),
        nullable=False,
        default="forecast",
    )
    model_run_id = Column(String(50))

    created_at = Column(TIMESTAMP, server_default=func.now())

    __table_args__ = (
        UniqueConstraint(
            "region", "year", "model_used", "model_run_id",
            name="uq_region_year_model_run",
        ),
    )

    def __repr__(self):
        return (
            f"<PovertyPrediction region={self.region} year={self.year} "
            f"model={self.model_used} value={self.predicted_poverty_incidence}>"
        )
