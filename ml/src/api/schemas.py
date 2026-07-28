"""
Pydantic schemas defining request/response shapes for the API.
Keeps FastAPI route functions clean -- they just return these models,
FastAPI handles serialization automatically.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


# ---------------------------------------------------------------------
# Actuals
# ---------------------------------------------------------------------
class ActualIndicatorOut(BaseModel):
    id: int
    region: str
    year: int
    avg_household_income: float
    avg_household_expenditure: float
    avg_family_size: float
    employment_rate: float
    avg_educational_attainment: float
    home_ownership_pct: float
    electricity_access_pct: float
    safe_water_access_pct: float
    sanitary_toilet_access_pct: float
    refrigerator_ownership_pct: float
    vehicle_ownership_pct: float
    inflation_rate: float
    poverty_incidence: float
    source: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------
# Forecasts
# ---------------------------------------------------------------------
class ForecastedIndicatorOut(BaseModel):
    id: int
    region: str
    year: int
    avg_household_income: Optional[float] = None
    avg_household_expenditure: Optional[float] = None
    avg_family_size: Optional[float] = None
    employment_rate: Optional[float] = None
    avg_educational_attainment: Optional[float] = None
    home_ownership_pct: Optional[float] = None
    electricity_access_pct: Optional[float] = None
    safe_water_access_pct: Optional[float] = None
    sanitary_toilet_access_pct: Optional[float] = None
    refrigerator_ownership_pct: Optional[float] = None
    vehicle_ownership_pct: Optional[float] = None
    inflation_rate: Optional[float] = None
    arima_order: Optional[str] = None
    model_run_id: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------
# Predictions
# ---------------------------------------------------------------------
class PredictionOut(BaseModel):
    id: int
    region: str
    year: int
    predicted_poverty_incidence: float
    model_used: str
    input_source: str
    model_run_id: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------
# Pipeline operation responses
# ---------------------------------------------------------------------
class PipelineRunResponse(BaseModel):
    status: str
    message: str
    best_model: Optional[str] = None
    forecast_run_id: Optional[str] = None
    prediction_run_id: Optional[str] = None


class ModelComparisonOut(BaseModel):
    selection_metric: str
    best_model: str
    results: dict  # {model_name: {rmse, mae, r2}}


class MergeActualsResponse(BaseModel):
    status: str
    message: str
    rows_merged: int