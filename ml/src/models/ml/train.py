"""
Trains every model listed in configs/config.yaml's ml.active_models using
time-series-aware cross-validation (via sklearn's TimeSeriesSplit), then
refits each model on the FULL dataset for the actual saved artifact.

Each fold's predictions are logged individually for transparency, but the
final CV metrics are computed by POOLING all out-of-fold predictions
together and calculating ONE overall RMSE/MAE/R² -- not by averaging
per-fold metrics.

Usage (from the ml/ folder):
    python -m src.models.ml.train
"""

import time
from pathlib import Path

import yaml
from sklearn.model_selection import TimeSeriesSplit

from src.preprocess.load_clean import get_training_data
from src.models.ml.model_factory import get_model
from src.metrics.metrics import compute_metrics
from src.pipeline import training_status


PROJECT_ROOT = Path(__file__).resolve().parents[3]
SAVED_MODELS_DIR = PROJECT_ROOT / "saved_models" / "ml"


with open(PROJECT_ROOT / "configs" / "config.yaml", "r") as f:
    CONFIG = yaml.safe_load(f)


CV_FOLDS = CONFIG["ml"].get("cv_folds", 5)
RANDOM_STATE = CONFIG["ml"]["random_state"]
MIN_TRAIN_SIZE = 5  # skip folds whose training set is too small to be meaningful


def cross_validate_model(model_builder, X, y, years, n_splits=5, min_train_size=MIN_TRAIN_SIZE):
    """
    Runs TimeSeriesSplit cross-validation for a single model, printing
    detailed per-fold diagnostics (year ranges, timing, metrics).

    Final RMSE/MAE/R² are computed by pooling all out-of-fold predictions
    together and scoring once -- more stable than averaging tiny per-fold
    metrics on small datasets.
    """

    tscv = TimeSeriesSplit(n_splits=n_splits)

    fold_results = []
    pooled_y_true = []
    pooled_y_pred = []

    cv_start = time.perf_counter()

    for fold_number, (train_idx, test_idx) in enumerate(tscv.split(X), start=1):

        train_years = years.iloc[train_idx]
        test_years = years.iloc[test_idx]

        if len(train_idx) < min_train_size:
            print(
                f"    Fold {fold_number}/{n_splits}: "
                f"train={len(train_idx)} rows ({train_years.min()}-{train_years.max()}) "
                f"-- SKIPPED (below min_train_size={min_train_size})"
            )
            continue

        fold_start = time.perf_counter()

        X_train = X.iloc[train_idx]
        X_test = X.iloc[test_idx]
        y_train = y.iloc[train_idx]
        y_test = y.iloc[test_idx]

        model = model_builder()
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)

        fold_elapsed = time.perf_counter() - fold_start

        fold_metrics = compute_metrics(y_test.tolist(), y_pred.tolist())

        fold_result = {
            "fold": fold_number,
            "train_size": len(train_idx),
            "test_size": len(test_idx),
            "train_years": f"{train_years.min()}-{train_years.max()}",
            "test_years": f"{test_years.min()}-{test_years.max()}",
            "rmse": round(fold_metrics["rmse"], 4),
            "mae": round(fold_metrics["mae"], 4),
            "r2": round(fold_metrics["r2"], 4),
            "elapsed_sec": round(fold_elapsed, 3),
        }
        fold_results.append(fold_result)

        print(
            f"    Fold {fold_number}/{n_splits}: "
            f"train={len(train_idx):>2} ({fold_result['train_years']}) | "
            f"test={len(test_idx)} ({fold_result['test_years']}) | "
            f"RMSE={fold_result['rmse']:>7.4f} | "
            f"MAE={fold_result['mae']:>7.4f} | "
            f"R²={fold_result['r2']:>8.4f} | "
            f"{fold_elapsed*1000:.0f}ms"
        )

        pooled_y_true.extend(y_test.tolist())
        pooled_y_pred.extend(y_pred.tolist())

    cv_elapsed = time.perf_counter() - cv_start

    if not fold_results:
        raise ValueError(
            "No cross-validation folds were generated. "
            "Check the number of observations, cv_folds, and min_train_size."
        )

    pooled_metrics = compute_metrics(pooled_y_true, pooled_y_pred)

    print(f"    -> {len(fold_results)}/{n_splits} folds used, {len(pooled_y_true)} pooled test points, "
          f"total CV time {cv_elapsed:.2f}s")

    return {
        "rmse": round(pooled_metrics["rmse"], 4),
        "mae": round(pooled_metrics["mae"], 4),
        "r2": round(pooled_metrics["r2"], 4),
        "fold_count": len(fold_results),
        "test_points": len(pooled_y_true),
        "fold_results": fold_results,
        "cv_elapsed_sec": round(cv_elapsed, 3),
    }


def train_all_models():
    """
    Cross-validates every active model using TimeSeriesSplit, then refits
    each model on the FULL dataset and saves it to disk.
    """

    run_start = time.perf_counter()

    training_status.update(step="loading_dataset", progress=5, message="Loading dataset...")

    print("=" * 70)
    print("[train] Loading training data...")
    X, y, years = get_training_data()
    print(f"[train] Loaded {len(X)} rows, years {years.min()}-{years.max()}, "
          f"{X.shape[1]} features: {list(X.columns)}")
    print(f"[train] Target: poverty_incidence, range {y.min():.2f}%-{y.max():.2f}%, "
          f"mean {y.mean():.2f}%, std {y.std():.2f}")

    training_status.update(step="preprocessing", progress=10, message="Preprocessing...")

    active_model_names = CONFIG["ml"]["active_models"]
    total = len(active_model_names)

    if len(X) <= CV_FOLDS:
        raise ValueError(
            f"Not enough observations ({len(X)}) for {CV_FOLDS}-fold TimeSeriesSplit."
        )

    n_splits = CV_FOLDS
    print(f"[train] Config: {n_splits}-fold TimeSeriesSplit, min_train_size={MIN_TRAIN_SIZE}, "
          f"selection_metric={CONFIG['ml']['selection_metric']}")
    print(f"[train] Active models: {active_model_names}")
    print("=" * 70)

    cv_results = {}
    fitted_models = {}

    SAVED_MODELS_DIR.mkdir(parents=True, exist_ok=True)

    for idx, model_name in enumerate(active_model_names):

        progress = int(15 + (idx / total) * 45)
        display_name = model_name.replace("_", " ").title()

        training_status.update(
            step="training",
            progress=progress,
            message=f"Cross-validating {display_name} ({n_splits}-fold)...",
        )

        def model_builder(name=model_name):
            return get_model(name)

        print(f"\n[train] [{idx + 1}/{total}] Cross-validating {model_name} ({n_splits}-fold)...")

        cv_results[model_name] = cross_validate_model(
            model_builder, X, y, years, n_splits=n_splits,
        )

        result = cv_results[model_name]
        print(f"[train] {model_name} pooled result "
              f"({result['test_points']} test points, {result['fold_count']} folds): "
              f"RMSE={result['rmse']:.4f}  MAE={result['mae']:.4f}  R²={result['r2']:.4f}")

        fit_start = time.perf_counter()
        print(f"[train] Training final {model_name} on FULL dataset ({len(X)} rows)...")
        final_model = model_builder()
        final_model.fit(X, y)
        fit_elapsed = time.perf_counter() - fit_start
        print(f"[train] Final {model_name} fit complete in {fit_elapsed*1000:.0f}ms")

        fitted_models[model_name] = final_model

    training_status.update(step="saving", progress=62, message="Saving models...")

    print(f"\n[train] Saving {len(fitted_models)} models...")
    for name, model in fitted_models.items():
        save_path = SAVED_MODELS_DIR / f"{name}.pkl"
        model.save(save_path)
        print(f"[train]   {name}.pkl -> {save_path}")

    total_elapsed = time.perf_counter() - run_start
    print(f"\n[train] Full training run complete in {total_elapsed:.2f}s")
    print("=" * 70)

    return fitted_models, cv_results


if __name__ == "__main__":

    fitted_models, cv_results = train_all_models()

    print("\n[train] === FINAL SUMMARY ===")
    print(f"{'Model':<16} {'RMSE':>8} {'MAE':>8} {'R²':>9} {'Folds':>6} {'Points':>7}")
    print("-" * 60)
    for name, metrics in cv_results.items():
        print(f"{name:<16} {metrics['rmse']:>8.4f} {metrics['mae']:>8.4f} "
              f"{metrics['r2']:>9.4f} {metrics['fold_count']:>6} {metrics['test_points']:>7}")