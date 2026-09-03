"""
Evaluates every active model via time-series cross-validation
(train_all_models handles the CV itself), determines the best one by
the configured selection metric, saves the winner as best_model.pkl
and a comparison report as JSON.

Usage (from the ml/ folder):
    python -m src.models.ml.evaluate
"""

import json
import shutil
from pathlib import Path

import yaml

from src.models.ml.train import train_all_models, SAVED_MODELS_DIR
from src.metrics.metrics import format_metrics, is_better
from src.pipeline import training_status

PROJECT_ROOT = Path(__file__).resolve().parents[3]  # ml/src/models/ml/evaluate.py -> ml/

with open(PROJECT_ROOT / "configs" / "config.yaml", "r") as f:
    CONFIG = yaml.safe_load(f)

SELECTION_METRIC = CONFIG["ml"]["selection_metric"]  # rmse | mae | r2


def evaluate_all():
    """
    Runs cross-validated training for all active models and determines
    the best one according to SELECTION_METRIC (averaged across folds).

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
              f"(avg over {metrics['fold_count']} folds)")

        if best_metrics is None or is_better(metrics, best_metrics, SELECTION_METRIC):
            best_metrics = metrics
            best_model_name = name

    return cv_results, best_model_name, fitted_models


def save_comparison_report(results: dict, best_model_name: str):
    """Saves all models' CV metrics + the winner to a JSON file for reference."""
    report = {
        "selection_metric": SELECTION_METRIC,
        "validation_method": f"TimeSeriesSplit cross-validation (min {CONFIG['ml'].get('cv_folds', 3)} folds, min 10 training rows per fold)",
        "best_model": best_model_name,
        "results": results,
    }
    report_path = SAVED_MODELS_DIR / "model_comparison_results.json"
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"\n[evaluate] Comparison report saved -> {report_path}")


def promote_best_model(best_model_name: str):
    """Copies the winning model's .pkl (already trained on full data) to best_model.pkl."""
    source = SAVED_MODELS_DIR / f"{best_model_name}.pkl"
    destination = SAVED_MODELS_DIR / "best_model.pkl"
    shutil.copy(source, destination)
    print(f"[evaluate] Best model ({best_model_name}) promoted -> {destination}")


def run():
    results, best_model_name, _ = evaluate_all()
    save_comparison_report(results, best_model_name)
    promote_best_model(best_model_name)

    print(f"\n[evaluate] WINNER: {best_model_name} "
          f"(selected on {SELECTION_METRIC.upper()}, cross-validated)")
    return best_model_name


if __name__ == "__main__":
    run()