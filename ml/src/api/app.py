from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
import joblib
from flask import Flask, jsonify, request

from src.evaluation.metrics import rank_models, regression_metrics
from src.features.preprocessing import (
    REGION_COL,
    TARGET_COL,
    YEAR_COL,
    chronological_train_test_split,
    create_lag_features,
    generate_mock_region_year_data,
    load_dataset,
    to_region_year,
)
from src.models.forecasting.arima import forecast_region_arima
from src.models.regressor.random_forest import build_random_forest
from src.models.regressor.ridge import build_ridge
from src.models.regressor.xgboost import build_xgboost


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_PATH = PROJECT_ROOT / "data" / "raw" / "mock_poverty_raw.csv"
OUTPUT_DIR = PROJECT_ROOT / "outputs"
MODEL_DIR = OUTPUT_DIR / "models"
DEFAULT_LAGS = (1, 2)
MODEL_ALIASES = {
    "auto": "auto",
    "ridge": "Ridge Regression",
    "ridge_regression": "Ridge Regression",
    "random_forest": "Random Forest Regressor",
    "random_forest_regressor": "Random Forest Regressor",
    "xgboost": "XGBoost Regressor",
    "xgboost_regressor": "XGBoost Regressor",
}

app = Flask(__name__)


@app.get("/")
def home():
    return jsonify(
        {
            "message": "Regional Poverty Prediction API",
            "endpoints": {
                "health": "GET /health",
                "metrics": "GET /api/metrics",
                "feature_importance": "GET /api/metrics/feature-importance?top_n=10",
                "forecast_get": "GET /api/forecast?region=NCR&periods=3",
                "forecast_post": "POST /api/forecast",
                "predict": "POST /api/predict",
            },
        }
    )


@app.get("/health")
def health():
    bundle = get_model_bundle()
    return jsonify(
        {
            "status": "ok",
            "best_model": bundle["best_model_name"],
            "regions": sorted(bundle["region_year"][REGION_COL].unique().tolist()),
            "latest_year": int(bundle["region_year"][YEAR_COL].max()),
            "available_models": ["auto", "ridge", "random_forest", "xgboost"],
        }
    )


@app.get("/api/metrics")
def metrics():
    bundle = get_model_bundle()
    return jsonify(
        {
            "best_model": bundle["best_model_name"],
            "metrics": records(bundle["model_ranking"]),
        }
    )


@app.get("/api/metrics/feature-importance")
def feature_importance():
    top_n = int(request.args.get("top_n", 20))
    bundle = get_model_bundle()
    table = bundle["feature_importance"].head(top_n)
    return jsonify(
        {
            "best_model": bundle["best_model_name"],
            "top_n": top_n,
            "features": records(table),
        }
    )


@app.get("/api/forecast")
def forecast_get():
    region = request.args.get("region")
    periods = int(request.args.get("periods", 3))
    if not region:
        return jsonify({"error": "Query parameter 'region' is required."}), 400
    return forecast_for_region(region=region, periods=periods)


@app.post("/api/forecast")
def forecast_post():
    payload = request.get_json(silent=True) or {}
    region = payload.get("region")
    periods = int(payload.get("periods", 3))
    if not region:
        return jsonify({"error": "JSON field 'region' is required."}), 400

    if "history" in payload:
        history = pd.DataFrame(payload["history"])
        missing = {YEAR_COL, TARGET_COL} - set(history.columns)
        if missing:
            return jsonify({"error": f"History is missing columns: {sorted(missing)}"}), 400
        history[REGION_COL] = region
        try:
            forecast = forecast_region_arima(history, region=region, periods=periods)
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400
        return jsonify({"region": region, "periods": periods, "forecast": records(forecast)})

    return forecast_for_region(region=region, periods=periods)


@app.post("/api/predict")
def predict():
    payload = request.get_json(silent=True) or {}
    bundle = get_model_bundle()
    region_year = bundle["region_year"]
    feature_cols = bundle["feature_cols"]
    model_choice = payload.get("model", request.args.get("model", "auto"))
    try:
        model_name = select_model_name(model_choice, bundle["model_ranking"])
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    model = bundle["models"][model_name]

    region = payload.get("region")
    if not region:
        return jsonify({"error": "JSON field 'region' is required."}), 400

    requested_year = payload.get("year")
    if requested_year is None:
        latest_year = int(region_year.loc[region_year[REGION_COL] == region, YEAR_COL].max())
        requested_year = latest_year + 1
    requested_year = int(requested_year)

    try:
        feature_row = build_prediction_row(
            region_year=region_year,
            feature_cols=feature_cols,
            region=region,
            year=requested_year,
            payload=payload,
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    prediction = float(model.predict(feature_row[feature_cols])[0])
    prediction = float(np.clip(prediction, 0, 100))

    return jsonify(
        {
            "region": region,
            "year": requested_year,
            "model": model_name,
            "predicted_poverty_incidence": round(prediction, 4),
            "used_features": feature_row.iloc[0].to_dict(),
        }
    )


def forecast_for_region(region: str, periods: int):
    bundle = get_model_bundle()
    region_year = bundle["region_year"]
    history = region_year[region_year[REGION_COL].str.lower() == region.lower()]
    if history.empty:
        return jsonify({"error": f"Region not found: {region}"}), 404
    canonical_region = str(history.iloc[0][REGION_COL])
    forecast = forecast_region_arima(history, region=canonical_region, periods=periods)
    return jsonify(
        {
            "region": canonical_region,
            "periods": periods,
            "history_years": [
                int(history[YEAR_COL].min()),
                int(history[YEAR_COL].max()),
            ],
            "forecast": records(forecast),
        }
    )


@lru_cache(maxsize=1)
def get_model_bundle() -> dict[str, Any]:
    raw = load_dataset(DATA_PATH) if DATA_PATH.exists() else generate_mock_region_year_data()
    region_year = to_region_year(raw)
    modeled, feature_cols = create_lag_features(region_year, lags=DEFAULT_LAGS)
    train_df, test_df = chronological_train_test_split(modeled, test_years=3)

    X_train, y_train = train_df[feature_cols], train_df[TARGET_COL]
    X_test, y_test = test_df[feature_cols], test_df[TARGET_COL]

    models = {
        "Ridge Regression": build_ridge(),
        "Random Forest Regressor": build_random_forest(),
        "XGBoost Regressor": build_xgboost(),
    }

    metrics_by_model = {}
    fitted_models = {}
    for name, model in models.items():
        model.fit(X_train, y_train)
        predictions = model.predict(X_test)
        metrics_by_model[name] = regression_metrics(y_test, predictions)
        fitted_models[name] = model

    model_ranking = rank_models(metrics_by_model)
    best_model_name = str(model_ranking.loc[0, "model"])
    best_model = fitted_models[best_model_name]
    importance = get_feature_importance(best_model, best_model_name, feature_cols)

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(best_model, MODEL_DIR / "best_poverty_model.joblib")
    joblib.dump(best_model, MODEL_DIR / "poverty_model.joblib")
    joblib.dump(
        {
            "best_model_name": best_model_name,
            "selected_model_name": best_model_name,
            "model_selection": "auto",
            "feature_columns": feature_cols,
            "lags": list(DEFAULT_LAGS),
            "target_column": TARGET_COL,
            "region_column": REGION_COL,
            "year_column": YEAR_COL,
        },
        MODEL_DIR / "model_metadata.joblib",
    )

    return {
        "region_year": region_year,
        "modeled": modeled,
        "feature_cols": feature_cols,
        "model_ranking": model_ranking,
        "best_model_name": best_model_name,
        "best_model": best_model,
        "models": fitted_models,
        "feature_importance": importance,
    }


def select_model_name(model_choice: str, model_ranking: pd.DataFrame) -> str:
    normalized = str(model_choice).strip().lower().replace("-", "_").replace(" ", "_")
    if normalized not in MODEL_ALIASES:
        raise ValueError("Invalid model. Use one of: auto, ridge, random_forest, xgboost.")
    selected = MODEL_ALIASES[normalized]
    if selected == "auto":
        return str(model_ranking.loc[0, "model"])
    return selected


def build_prediction_row(
    region_year: pd.DataFrame,
    feature_cols: list[str],
    region: str,
    year: int,
    payload: dict[str, Any],
) -> pd.DataFrame:
    region_history = region_year[region_year[REGION_COL].str.lower() == region.lower()].sort_values(YEAR_COL)
    if region_history.empty:
        raise ValueError(f"Region not found: {region}")

    values: dict[str, float] = {}
    for feature in feature_cols:
        base_indicator, lag = feature.rsplit("_lag_", 1)
        lag_year = year - int(lag)
        match = region_history[region_history[YEAR_COL] == lag_year]
        if not match.empty and base_indicator in match.columns:
            values[feature] = float(match.iloc[0][base_indicator])

    for lag_key in ("lag_1", "lag_2"):
        if lag_key in payload and isinstance(payload[lag_key], dict):
            lag_number = int(lag_key.replace("lag_", ""))
            for indicator, value in payload[lag_key].items():
                values[f"{indicator}_lag_{lag_number}"] = float(value)

    if "features" in payload and isinstance(payload["features"], dict):
        for feature, value in payload["features"].items():
            values[feature] = float(value)

    fallback = region_year.select_dtypes(include=[np.number]).median(numeric_only=True).to_dict()
    row = {}
    missing = []
    for feature in feature_cols:
        if feature in values and np.isfinite(values[feature]):
            row[feature] = values[feature]
            continue
        base_indicator = feature.rsplit("_lag_", 1)[0]
        if base_indicator in fallback and np.isfinite(fallback[base_indicator]):
            row[feature] = float(fallback[base_indicator])
        else:
            row[feature] = 0.0
            missing.append(feature)

    if len(values) == 0:
        raise ValueError(
            "No usable lag data was found. Use a year with two previous records "
            "or provide lag_1/lag_2 values in the request."
        )

    result = pd.DataFrame([row])
    result.attrs["missing_features"] = missing
    return result


def get_feature_importance(model, model_name: str, feature_cols: list[str]) -> pd.DataFrame:
    final_model = model.named_steps["model"] if hasattr(model, "named_steps") else model
    if hasattr(final_model, "feature_importances_"):
        importance = np.asarray(final_model.feature_importances_, dtype=float)
        method = "model_importance"
    elif hasattr(final_model, "coef_"):
        importance = np.abs(np.asarray(final_model.coef_, dtype=float))
        method = "absolute_coefficient"
    else:
        importance = np.zeros(len(feature_cols), dtype=float)
        method = "not_available"

    table = pd.DataFrame(
        {
            "feature": feature_cols,
            "importance": importance,
            "method": method,
            "model": model_name,
        }
    )
    total = table["importance"].abs().sum()
    table["importance_pct"] = np.where(total > 0, table["importance"].abs() / total * 100, 0)
    table["base_indicator"] = table["feature"].str.replace(r"_lag_\d+$", "", regex=True)
    table["lag"] = table["feature"].str.extract(r"_lag_(\d+)$").astype(int)
    return table.sort_values("importance_pct", ascending=False).reset_index(drop=True)


def records(df: pd.DataFrame) -> list[dict[str, Any]]:
    clean = df.replace({np.nan: None})
    return clean.to_dict(orient="records")


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
