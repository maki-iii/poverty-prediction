"""
FastAPI backend exposing the poverty prediction pipeline.

Run (from the ml/ folder):
    uvicorn src.api.main:app --reload --port 8000

Docs available at: http://127.0.0.1:8000/docs
"""

import tempfile
from pathlib import Path

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

from src.database.repository.actuals_repo import get_actuals, get_years_present, upsert_year
from src.database.repository.forecasts_repo import get_forecasts, get_latest_run_id as get_latest_forecast_run_id
from src.database.repository.predictions_repo import get_predictions

from src.models.forecasting.forecast_inputs import run as run_forecast_pipeline
from src.models.ml.evaluate import run as run_evaluate_pipeline
from src.models.ml.predict_poverty import predict as run_predict_pipeline
from src.pipeline.run_full_pipeline import run_full_pipeline
from src.pipeline.merge_new_actuals import load_new_actuals_file

from src.api.schemas import (
    ActualIndicatorOut,
    ForecastedIndicatorOut,
    PredictionOut,
    PipelineRunResponse,
    ModelComparisonOut,
    MergeActualsResponse,
)

import json
from pathlib import Path as _Path

PROJECT_ROOT = _Path(__file__).resolve().parents[2]  # ml/src/api/main.py -> ml/
SAVED_MODELS_DIR = PROJECT_ROOT / "saved_models" / "ml"

app = FastAPI(
    title="NCR Poverty Prediction API",
    description="Serves actuals, ARIMA-forecasted inputs, and ML-predicted poverty incidence.",
    version="1.0.0",
)

# Allow a frontend (e.g. React on a different port) to call this API during dev.
# Tighten allow_origins to your actual frontend URL before deploying.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["health"])
def health_check():
    return {"status": "ok", "message": "Poverty Prediction API is running."}


# =======================================================================
# ACTUALS
# =======================================================================
@app.get("/actuals", response_model=list[ActualIndicatorOut], tags=["actuals"])
def list_actuals(region: str = None, start_year: int = None, end_year: int = None):
    df = get_actuals(region=region, start_year=start_year, end_year=end_year)
    if df.empty:
        return []
    return df.to_dict(orient="records")


@app.get("/actuals/years", tags=["actuals"])
def list_actual_years(region: str = None):
    years = get_years_present(region=region)
    return {"region": region, "years": years}


# =======================================================================
# FORECASTS
# =======================================================================
@app.get("/forecasts", response_model=list[ForecastedIndicatorOut], tags=["forecasts"])
def list_forecasts(region: str = None, model_run_id: str = None):
    df = get_forecasts(region=region, model_run_id=model_run_id)
    if df.empty:
        return []
    return df.to_dict(orient="records")


@app.get("/forecasts/latest", response_model=list[ForecastedIndicatorOut], tags=["forecasts"])
def list_latest_forecasts(region: str = "NCR"):
    latest_run_id = get_latest_forecast_run_id(region=region)
    if latest_run_id is None:
        raise HTTPException(status_code=404, detail="No forecasts found. Run /pipeline/forecast first.")
    df = get_forecasts(region=region, model_run_id=latest_run_id)
    return df.to_dict(orient="records")


# =======================================================================
# PREDICTIONS
# =======================================================================
@app.get("/predictions", response_model=list[PredictionOut], tags=["predictions"])
def list_predictions(region: str = None, model_run_id: str = None):
    df = get_predictions(region=region, model_run_id=model_run_id)
    if df.empty:
        return []
    return df.to_dict(orient="records")


@app.get("/predictions/latest", response_model=list[PredictionOut], tags=["predictions"])
def list_latest_predictions(region: str = "NCR"):
    df = get_predictions(region=region)
    if df.empty:
        raise HTTPException(status_code=404, detail="No predictions found. Run /pipeline/predict first.")
    latest_run_id = df.sort_values("created_at").iloc[-1]["model_run_id"]
    df = df[df["model_run_id"] == latest_run_id]
    return df.to_dict(orient="records")


# =======================================================================
# MODEL COMPARISON
# =======================================================================
@app.get("/models/comparison", response_model=ModelComparisonOut, tags=["models"])
def get_model_comparison():
    report_path = SAVED_MODELS_DIR / "model_comparison_results.json"
    if not report_path.exists():
        raise HTTPException(status_code=404, detail="No comparison report found. Run /pipeline/train first.")
    with open(report_path, "r") as f:
        report = json.load(f)
    return report


# =======================================================================
# PIPELINE TRIGGERS
# =======================================================================
@app.post("/pipeline/forecast", response_model=PipelineRunResponse, tags=["pipeline"])
def trigger_forecast():
    try:
        run_forecast_pipeline()
        return PipelineRunResponse(status="success", message="ARIMA forecasting completed.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/pipeline/train", response_model=PipelineRunResponse, tags=["pipeline"])
def trigger_train_and_evaluate():
    try:
        best_model_name = run_evaluate_pipeline()
        return PipelineRunResponse(
            status="success",
            message="Training and evaluation completed.",
            best_model=best_model_name,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/pipeline/predict", response_model=PipelineRunResponse, tags=["pipeline"])
def trigger_predict():
    try:
        records = run_predict_pipeline()
        run_id = records[0]["model_run_id"] if records else None
        return PipelineRunResponse(
            status="success",
            message=f"Predicted poverty incidence for {len(records)} year(s).",
            prediction_run_id=run_id,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/pipeline/run-full", response_model=PipelineRunResponse, tags=["pipeline"])
def trigger_full_pipeline():
    try:
        run_full_pipeline()
        return PipelineRunResponse(
            status="success",
            message="Full pipeline (forecast -> train -> evaluate -> predict) completed.",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =======================================================================
# MERGE NEW ACTUALS (file upload)
# =======================================================================
@app.post("/actuals/merge", response_model=MergeActualsResponse, tags=["actuals"])
def merge_new_actuals(file: UploadFile = File(...)):
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="File must be an .xlsx or .xls file.")

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx") as tmp:
            tmp.write(file.file.read())
            tmp_path = Path(tmp.name)

        df = load_new_actuals_file(tmp_path)
        df["source"] = "actual"

        count = 0
        for _, row in df.iterrows():
            upsert_year(row.to_dict())
            count += 1

        tmp_path.unlink(missing_ok=True)

        return MergeActualsResponse(
            status="success",
            message=f"Merged {count} year(s) into actuals. "
                    f"Run /pipeline/run-full to refresh forecasts/predictions.",
            rows_merged=count,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))