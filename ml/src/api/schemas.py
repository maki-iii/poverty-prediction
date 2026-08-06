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


# ---------------------------------------------------------------------
# Dataset management
# ---------------------------------------------------------------------
class DatasetOut(BaseModel):
    id: int
    original_filename: str
    uploaded_by: Optional[str] = None
    stored_filename: str
    stored_path: str
    region: Optional[str] = None
    year_range: Optional[str] = None
    row_count: Optional[int] = None
    survey_type: Optional[str] = None
    status: str
    error_message: Optional[str] = None

    processed_year: Optional[int] = None
    processed_avg_household_income: Optional[float] = None
    processed_avg_household_expenditure: Optional[float] = None
    processed_avg_family_size: Optional[float] = None
    processed_employment_rate: Optional[float] = None
    processed_avg_educational_attainment: Optional[float] = None
    processed_inflation_rate: Optional[float] = None
    processed_poverty_incidence: Optional[float] = None

    uploaded_at: Optional[str] = None
    merged_at: Optional[str] = None

    class Config:
        from_attributes = True


class MergeDatasetResponse(BaseModel):
    status: str
    message: str
    dataset_id: int
    filename: str
    rows_merged: int


class DeleteDatasetResponse(BaseModel):
    status: str
    message: str
    filename: str

class ProcessDatasetRequest(BaseModel):
    survey_type: str
    year: int
    inflation_rate: float
    poverty_incidence: float

class FeatureImportanceOut(BaseModel):
    model_used: str
    importances: dict  # {feature_name: importance_score}, sorted descending
    top_feature: str
    top_feature_pct: float

class TrainingRunOut(BaseModel):
    id: int
    status: str
    best_model: Optional[str] = None
    selection_metric: Optional[str] = None
    results: Optional[dict] = None
    prediction_years: Optional[str] = None
    error_message: Optional[str] = None
    triggered_by: Optional[str] = None
    started_at: Optional[str] = None
    finished_at: Optional[str] = None

    class Config:
        from_attributes = True