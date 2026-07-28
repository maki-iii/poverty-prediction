"""
ActualIndicators table: real, observed data (survey-sourced or seeded).
This is the ONLY table the ML models train on.
"""

from sqlalchemy import (
    Column, Integer, String, DECIMAL, Enum, TIMESTAMP, UniqueConstraint, func
)

from src.database.base import Base


class ActualIndicators(Base):
    __tablename__ = "actuals"

    id = Column(Integer, primary_key=True, autoincrement=True)
    region = Column(String(50), nullable=False)
    year = Column(Integer, nullable=False)

    avg_household_income = Column(DECIMAL(12, 2), nullable=False)
    avg_household_expenditure = Column(DECIMAL(12, 2), nullable=False)
    avg_family_size = Column(DECIMAL(4, 2), nullable=False)
    employment_rate = Column(DECIMAL(5, 2), nullable=False)
    avg_educational_attainment = Column(DECIMAL(5, 2), nullable=False)
    home_ownership_pct = Column(DECIMAL(5, 2), nullable=False)
    electricity_access_pct = Column(DECIMAL(5, 2), nullable=False)
    safe_water_access_pct = Column(DECIMAL(5, 2), nullable=False)
    sanitary_toilet_access_pct = Column(DECIMAL(5, 2), nullable=False)
    refrigerator_ownership_pct = Column(DECIMAL(5, 2), nullable=False)
    vehicle_ownership_pct = Column(DECIMAL(5, 2), nullable=False)
    inflation_rate = Column(DECIMAL(5, 2), nullable=False)

    poverty_incidence = Column(DECIMAL(5, 2), nullable=False)  # target

    source = Column(Enum("actual", "seed", name="source_enum"), nullable=False, default="seed")

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("region", "year", name="uq_region_year"),
    )

    def __repr__(self):
        return f"<ActualIndicators region={self.region} year={self.year}>"