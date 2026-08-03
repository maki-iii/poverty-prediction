"""
FastAPI backend exposing the poverty prediction pipeline.

Run (from the ml/ folder):
    uvicorn src.api.main:app --reload --port 8000

Docs available at: http://127.0.0.1:8000/docs
"""

import tempfile
import threading
from pathlib import Path

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware

from src.database.repository.actuals_repo import get_actuals, get_years_present, upsert_year, delete_actual
from src.database.repository.forecasts_repo import get_forecasts, get_latest_run_id as get_latest_forecast_run_id
from src.database.repository.predictions_repo import get_predictions

from src.models.forecasting.forecast_inputs import run as run_forecast_pipeline
from src.models.ml.evaluate import run as run_evaluate_pipeline
from src.models.ml.predict_poverty import predict as run_predict_pipeline
from src.pipeline.run_full_pipeline import run_full_pipeline
from src.pipeline.merge_new_actuals import load_new_actuals_file

from src.pipeline import training_status

from src.pipeline.dataset_management import process_dataset
from src.api.schemas import ProcessDatasetRequest

from src.api.schemas import (
    ActualIndicatorOut,
    ForecastedIndicatorOut,
    PredictionOut,
    PipelineRunResponse,
    ModelComparisonOut,
    MergeActualsResponse,
    FeatureImportanceOut,
    TrainingRunOut
)

from src.database.repository.training_runs_repo import list_runs

from src.pipeline.dataset_management import (
    save_uploaded_file,
    get_datasets,
    merge_dataset,
    remove_dataset,
)
from src.api.schemas import DatasetOut, MergeDatasetResponse, DeleteDatasetResponse
from src.models.ml.feature_importance import get_feature_importance_data

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

@app.delete("/actuals/{year}", tags=["actuals"])
def delete_actual_endpoint(year: int, region: str = "NCR"):
    deleted = delete_actual(region=region, year=year)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"No actuals row found for {region} {year}")
    return {"status": "success", "message": f"Deleted {region} {year} from actuals."}

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


def _run_training_background():
    try:
        training_status.reset()
        best_model_name = run_evaluate_pipeline()

        training_status.update(step="predicting", progress=85, message="Generating predictions...")
        run_predict_pipeline()

        # Load the comparison report to include in the history record
        report_path = SAVED_MODELS_DIR / "model_comparison_results.json"
        results = None
        selection_metric = None
        if report_path.exists():
            with open(report_path, "r") as f:
                report = json.load(f)
                results = report.get("results")
                selection_metric = report.get("selection_metric")

        # Determine prediction year range from the latest forecast run
        prediction_years = None
        try:
            df = get_forecasts(region="NCR")
            if not df.empty:
                years = sorted(df["year"].unique())
                prediction_years = f"{years[0]}-{years[-1]}" if len(years) > 1 else str(years[0])
        except Exception:
            pass

        training_status.update(step="finalizing", progress=98, message="Training Complete.")
        training_status.complete(
            best_model_name,
            results=results,
            selection_metric=selection_metric,
            prediction_years=prediction_years,
        )
    except Exception as e:
        training_status.fail(e)


@app.post("/pipeline/train", response_model=PipelineRunResponse, tags=["pipeline"])
def trigger_train_and_evaluate():
    if training_status.is_running():
        raise HTTPException(status_code=409, detail="Training is already in progress.")

    thread = threading.Thread(target=_run_training_background, daemon=True)
    thread.start()

    return PipelineRunResponse(
        status="started",
        message="Training started. Poll /pipeline/train-status for progress.",
    )


@app.get("/pipeline/train-status", tags=["pipeline"])
def get_train_status():
    return training_status.get_status()


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


# =======================================================================
# DATASET MANAGEMENT (upload -> review -> merge)
# =======================================================================
@app.post("/datasets/upload", response_model=DatasetOut, tags=["datasets"])
def upload_dataset(file: UploadFile = File(...), uploaded_by: str = Form(None)):
    if not file.filename.endswith((".xlsx", ".xls", ".CSV")):
        raise HTTPException(status_code=400, detail="File must be an .xlsx, .xls, or .csv file.")
    try:
        file_bytes = file.file.read()
        record = save_uploaded_file(file_bytes, file.filename, uploaded_by=uploaded_by)
        return record
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/datasets", response_model=list[DatasetOut], tags=["datasets"])
def list_all_datasets(status: str = None):
    return get_datasets(status=status)


@app.post("/datasets/{dataset_id}/merge", response_model=MergeDatasetResponse, tags=["datasets"])
def merge_dataset_endpoint(dataset_id: int):
    try:
        result = merge_dataset(dataset_id)
        return MergeDatasetResponse(
            status="success",
            message=f"Merged {result['rows_merged']} row(s) into actuals. "
                    f"Run /pipeline/run-full to refresh forecasts/predictions.",
            dataset_id=dataset_id,
            rows_merged=result["rows_merged"],
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/datasets/{dataset_id}", response_model=DeleteDatasetResponse, tags=["datasets"])
def delete_dataset_endpoint(dataset_id: int):
    deleted = remove_dataset(dataset_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Dataset id={dataset_id} not found")
    return DeleteDatasetResponse(status="success", message=f"Dataset id={dataset_id} deleted.")

@app.post("/datasets/{dataset_id}/process", response_model=DatasetOut, tags=["datasets"])
def process_dataset_endpoint(dataset_id: int, request: ProcessDatasetRequest):
    try:
        record = process_dataset(
            dataset_id=dataset_id,
            survey_type=request.survey_type,
            year=request.year,
            inflation_rate=request.inflation_rate,
            poverty_incidence=request.poverty_incidence,
        )
        return record
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/models/feature-importance", response_model=FeatureImportanceOut, tags=["models"])
def get_feature_importance():
    try:
        return get_feature_importance_data()
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="No trained model found. Run /pipeline/train first.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/training-runs", response_model=list[TrainingRunOut], tags=["pipeline"])
def list_training_runs(limit: int = 50):
    df = list_runs(limit=limit)
    if df.empty:
        return []
    for col in ["started_at", "finished_at"]:
        if col in df.columns:
            df[col] = df[col].apply(lambda x: x.isoformat() if x is not None and str(x) != "NaT" else None)
    return df.to_dict(orient="records")