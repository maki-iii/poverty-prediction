"""
Evaluates every trained model on the held-out test set, compares them
using the metric configured in configs/config.yaml (default: RMSE), and
saves the winner as best_model.pkl + a comparison report as JSON.

Usage (from the ml/ folder):
    python -m src.models.ml.evaluate
"""

import json
import shutil
from pathlib import Path

import yaml

from src.models.ml.train import train_all_models, SAVED_MODELS_DIR
from src.metrics.metrics import compute_metrics, format_metrics, is_better

PROJECT_ROOT = Path(__file__).resolve().parents[3]  # ml/src/models/ml/evaluate.py -> ml/

with open(PROJECT_ROOT / "configs" / "config.yaml", "r") as f:
    CONFIG = yaml.safe_load(f)

SELECTION_METRIC = CONFIG["ml"]["selection_metric"]  # rmse | mae | r2


def evaluate_all():
    """
    Trains all active models (via train_all_models), scores each on the
    test set, and determines the best one according to SELECTION_METRIC.

    Returns:
        results (dict): {model_name: metrics_dict}
        best_model_name (str)
    """
    fitted_models, X_train, X_test, y_train, y_test = train_all_models()

    results = {}
    best_model_name = None
    best_metrics = None

    print()
    for name, model in fitted_models.items():
        y_pred = model.predict(X_test)
        metrics = compute_metrics(y_test, y_pred)
        results[name] = metrics
        print(f"[evaluate] {name:15s} {format_metrics(metrics)}")

        if best_metrics is None or is_better(metrics, best_metrics, SELECTION_METRIC):
            best_metrics = metrics
            best_model_name = name

    return results, best_model_name, fitted_models


def save_comparison_report(results: dict, best_model_name: str):
    """Saves all models' metrics + the winner to a JSON file for reference."""
    report = {
        "selection_metric": SELECTION_METRIC,
        "best_model": best_model_name,
        "results": results,
    }
    report_path = SAVED_MODELS_DIR / "model_comparison_results.json"
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"\n[evaluate] Comparison report saved -> {report_path}")


def promote_best_model(best_model_name: str):
    """Copies the winning model's .pkl to best_model.pkl for easy downstream loading."""
    source = SAVED_MODELS_DIR / f"{best_model_name}.pkl"
    destination = SAVED_MODELS_DIR / "best_model.pkl"
    shutil.copy(source, destination)
    print(f"[evaluate] Best model ({best_model_name}) promoted -> {destination}")


def run():
    results, best_model_name, _ = evaluate_all()
    save_comparison_report(results, best_model_name)
    promote_best_model(best_model_name)

    print(f"\n[evaluate] WINNER: {best_model_name} "
          f"(selected on {SELECTION_METRIC.upper()})")
    return best_model_name


if __name__ == "__main__":
    run()