"""
Evaluates every active model via the configured cross-validation method
(train_all_models handles the CV itself), determines the best one by
the configured selection metric, saves the winner as best_model.pkl
and a comparison report as JSON.

Usage (from the ml/ folder):
    python -m src.models.ml.evaluate
"""

from src.pipeline.operations import commit_section
import json
import shutil
from pathlib import Path

import yaml

from src.models.ml.train import train_all_models, SAVED_MODELS_DIR, validation_method
from src.metrics.metrics import format_metrics, is_better
from src.pipeline import training_status
from src.preprocess.history_mode import history_mode

PROJECT_ROOT = Path(__file__).resolve().parents[3]  # ml/src/models/ml/evaluate.py -> ml/

with open(PROJECT_ROOT / "configs" / "config.yaml", "r") as f:
    CONFIG = yaml.safe_load(f)

SELECTION_METRIC = CONFIG["ml"]["selection_metric"]  # rmse | mae | r2


def evaluate_all():
    """
    Runs cross-validated training for all active models and determines
    the best one according to SELECTION_METRIC (pooled held-out forecast errors).

    Returns:
        cv_results (dict): {model_name: {rmse, mae, r2, fold_count}}
        best_model_name (str)
        fitted_models (dict): {model_name: model fitted on FULL dataset}
    """
    fitted_models, cv_results = train_all_models()

    training_status.update(step="evaluating", progress=65, message="Comparing cross-validated results...")

    best_model_name = None
    best_metrics = None

    print()
    for name, metrics in cv_results.items():
        print(f"[evaluate] {name:15s} {format_metrics(metrics)} "
              f"(pooled over {metrics['fold_count']} validation folds)")

        if best_metrics is None or is_better(metrics, best_metrics, SELECTION_METRIC):
            best_metrics = metrics
            best_model_name = name

    return cv_results, best_model_name, fitted_models


def save_comparison_report(results: dict, best_model_name: str):
    """Saves all models' CV metrics + the winner to a JSON file for reference."""
    kfold = validation_method() == "kfold"
    baseline_key = "mean_baseline" if kfold else "persistence_baseline"
    report = {
        "data_history": history_mode(),
        "feature_columns": CONFIG["feature_columns"],
        "indicator_basis": "poor_families_weighted_mean_v1",
        "selection_metric": SELECTION_METRIC,
        "validation_mode": validation_method(),
        "validation_method": (
            "Shuffled K-fold on actual + interpolated rows; existing indicator inputs; nested K-fold tuning"
            if kfold else "Actual + interpolated training; expanding-window ARIMA + ML backtest on measured targets; nested chronological tuning"
        ),
        "evaluation_warning": (
            "K-fold scores include interpolated targets and use existing indicators. "
            "They do not measure three-year forecasting accuracy and are not directly comparable to chronological scores."
            if kfold else None
        ),
        "forecast_horizon_years": CONFIG["arima"]["forecast_horizon_years"],
        "minimum_training_targets": CONFIG["ml"].get("min_train_size", 5),
        "quality_warning": (
            "The selected model has not demonstrated reliable skill. "
            "Compare it with the baseline and review observed data coverage."
            if (results[best_model_name]["r2"] is None or results[best_model_name]["r2"] < 0
                or results[best_model_name]["rmse"] >= results[best_model_name][baseline_key]["rmse"])
            else None
        ),
        "best_model": best_model_name,
        "results": results,
    }
    report_path = SAVED_MODELS_DIR / "model_comparison_results.json"
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2, allow_nan=False)
    print(f"\n[evaluate] Comparison report saved -> {report_path}")


def promote_best_model(best_model_name: str):
    """Copies the winning model's .pkl (already trained on full data) to best_model.pkl."""
    source = SAVED_MODELS_DIR / f"{best_model_name}.pkl"
    destination = SAVED_MODELS_DIR / "best_model.pkl"
    shutil.copy(source, destination)
    print(f"[evaluate] Best model ({best_model_name}) promoted -> {destination}")


def run():
    results, best_model_name, _ = evaluate_all()
    with commit_section():
        save_comparison_report(results, best_model_name)
        promote_best_model(best_model_name)

    print(f"\n[evaluate] WINNER: {best_model_name} "
          f"(selected on {SELECTION_METRIC.upper()}, cross-validated)")
    return best_model_name


if __name__ == "__main__":
    run()
