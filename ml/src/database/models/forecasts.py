"""
ForecastedIndicators table: ARIMA-generated input indicators for years
without real FIES data yet (e.g. 2024, 2025, 2026).

Note: poverty_incidence is NOT here. It's not an ARIMA input -- it's
predicted downstream by the ML model and stored in `predictions`.
"""

from sqlalchemy import (
    Column, Integer, String, DECIMAL, TIMESTAMP, UniqueConstraint, func
)

from src.database.base import Base


class ForecastedIndicators(Base):
    __tablename__ = "forecasts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    region = Column(String(50), nullable=False)
    year = Column(Integer, nullable=False)

    avg_household_income = Column(DECIMAL(12, 2))
    avg_household_expenditure = Column(DECIMAL(12, 2))
    avg_family_size = Column(DECIMAL(4, 2))
    employment_rate = Column(DECIMAL(5, 2))
    avg_educational_attainment = Column(DECIMAL(5, 2))
    home_ownership_pct = Column(DECIMAL(5, 2))
    electricity_access_pct = Column(DECIMAL(5, 2))
    safe_water_access_pct = Column(DECIMAL(5, 2))
    sanitary_toilet_access_pct = Column(DECIMAL(5, 2))
    refrigerator_ownership_pct = Column(DECIMAL(5, 2))
    vehicle_ownership_pct = Column(DECIMAL(5, 2))
    inflation_rate = Column(DECIMAL(5, 2))

    arima_order = Column(String(20))     # e.g. "(1,1,1)" for traceability
    model_run_id = Column(String(50))    # groups indicators forecasted together

    created_at = Column(TIMESTAMP, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("region", "year", "model_run_id", name="uq_region_year_run"),
    )

    def __repr__(self):
        return f"<ForecastedIndicators region={self.region} year={self.year}>"