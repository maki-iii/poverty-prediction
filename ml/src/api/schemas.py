"""
Pydantic schemas defining request/response shapes for the API.
Keeps FastAPI route functions clean -- they just return these models,
FastAPI handles serialization automatically.
"""

from datetime import datetime
from typing import Optional, Literal

from pydantic import BaseModel, Field, ConfigDict


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
    inflation_rate: Optional[float] = None
    poverty_threshold: Optional[float] = None
    indicator_basis: Optional[str] = None
    poverty_incidence: Optional[float] = None
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
    data_history: Optional[str] = None
    validation_mode: Optional[str] = None
    evaluation_warning: Optional[str] = None
    validation_method: Optional[str] = None
    quality_warning: Optional[str] = None
    forecast_horizon_years: Optional[int] = None
    minimum_training_targets: Optional[int] = None
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
    processed_inflation_rate: Optional[float] = None
    processed_poverty_incidence: Optional[float] = None
    processed_poverty_threshold: Optional[float] = None
    indicator_basis: Optional[str] = None

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
    model_config = ConfigDict(allow_inf_nan=False, extra="forbid")
    survey_type: Literal["fies"] = "fies"
    year: int = Field(ge=1900, le=2100)
    poverty_threshold: float = Field(gt=0, le=9999999999.99, description="Annual poverty threshold in PHP per person")
    poverty_incidence: float = Field(ge=0, le=100)

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

class StartProcessResponse(BaseModel):
    status: str
    message: str
    dataset_id: int
