"""Selectable chronological pipeline validation or experimental shuffled K-fold.

Time-series mode scores measured targets with forecast indicators. K-fold scores
actual and interpolated rows with existing indicators; it is not a forecast test.
Both modes tune inside outer training splits and fit final models on all history.
"""
from src.pipeline.operations import checkpoint, commit_section
import time
from pathlib import Path
import numpy as np
import pandas as pd
import yaml
from sklearn.model_selection import ParameterGrid, KFold
from sklearn.base import clone
from src.preprocess.load_clean import get_training_frame, get_forecast_input_data, FEATURE_COLUMNS, TARGET_COLUMN
from src.models.forecasting.forecast_inputs import fit_and_forecast
from src.models.ml.model_factory import get_model
from src.metrics.metrics import compute_metrics
from src.pipeline import training_status

PROJECT_ROOT = Path(__file__).resolve().parents[3]
from src.pipeline.indicator_basis import SAVED_MODELS_DIR
CONFIG = yaml.safe_load((PROJECT_ROOT / "configs/config.yaml").read_text())
CV_FOLDS = CONFIG["ml"].get("cv_folds", 5)
MIN_TRAIN_SIZE = CONFIG["ml"].get("min_train_size", 5)


def validation_method():
    method = CONFIG["ml"].get("validation_method", "time_series")
    if method not in ("time_series", "kfold"):
        raise ValueError(f"Unsupported validation_method: {method}")
    return method


def prepare_kfold(X):
    """Experimental ML-only validation on actual and interpolated rows."""
    if CV_FOLDS < 2 or len(X) < CV_FOLDS:
        raise ValueError(f"K-fold requires at least {CV_FOLDS} rows and two folds.")
    splitter = KFold(n_splits=CV_FOLDS, shuffle=True,
                     random_state=CONFIG["ml"].get("random_state", 42))
    return [(tr, te, X.iloc[te].copy()) for tr, te in splitter.split(X)]


def validation_folds(years, horizon=3, max_folds=5, min_train_size=5, observed_mask=None):
    """Most recent non-overlapping calendar windows; at most `horizon` years ahead."""
    if horizon < 1 or max_folds < 1 or min_train_size < 3:
        raise ValueError("Use a positive horizon/fold count and at least three training targets.")
    observed = np.flatnonzero(np.ones(len(years), dtype=bool) if observed_mask is None
                              else np.asarray(observed_mask, dtype=bool))
    observed_years = years.iloc[observed].to_numpy()
    folds = []
    origin = min_train_size - 1
    while origin < len(observed) - 1:
        cutoff = int(observed_years[origin])
        test_positions = np.flatnonzero((observed_years > cutoff) &
                                        (observed_years <= cutoff + horizon))
        if len(test_positions):
            # Include interpolated training rows, but stop at an observed anchor.
            # No interpolation between the cutoff and a future target may enter.
            training = np.flatnonzero(years.to_numpy() <= cutoff)
            folds.append((training, observed[test_positions]))
            origin = int(test_positions[-1])
        else:
            origin += 1
    return folds[-max_folds:]



def fit_tuned_model(name, X, y, forecast_folds=None):
    model = get_model(name)
    grid = CONFIG["ml"].get("tuning", {}).get(name)
    if grid and forecast_folds:
        best_score, best_estimator = float("inf"), None
        for parameters in ParameterGrid(grid):
            errors = []
            for inner_train, inner_test, inner_forecast in forecast_folds:
                estimator = clone(model.model).set_params(**parameters)
                checkpoint()
                estimator.fit(X.iloc[inner_train], y.iloc[inner_train])
                prediction = np.clip(estimator.predict(inner_forecast), 0, 100)
                errors.extend((y.iloc[inner_test].to_numpy() - prediction) ** 2)
            score = float(np.mean(errors))
            if score < best_score:
                best_score = score
                best_estimator = clone(model.model).set_params(**parameters)
        checkpoint()
        model.model = best_estimator.fit(X, y)
    else:
        checkpoint()
        model.fit(X, y)
    return model


def prepare_validation(X, years, indicator_X, indicator_years, min_train_size=None, cache=None, allow_empty=False, observed_mask=None):
    horizon = CONFIG["arima"]["forecast_horizon_years"]
    folds = validation_folds(years, horizon, CV_FOLDS, min_train_size or MIN_TRAIN_SIZE, observed_mask)
    if not folds and not allow_empty:
        raise ValueError("Not enough observed targets for chronological validation: "
                         "need at least five training targets and a later target within the forecast horizon.")
    prepared = []
    for train, test in folds:
        cutoff = int(years.iloc[train[-1]])
        history = indicator_X.loc[indicator_years <= cutoff].copy()
        history.index = indicator_years.loc[indicator_years <= cutoff].astype(int)
        test_years = years.iloc[test].astype(int)
        steps = int(test_years.max()) - cutoff
        future = {}
        for col in X.columns:
            key = (col, cutoff, steps)
            if cache is not None and key in cache:
                values = cache[key]
            else:
                values, _ = fit_and_forecast(history[col], steps)
                if cache is not None:
                    cache[key] = values
            future[col] = [values[int(year) - cutoff - 1] for year in test_years]
        prepared.append((train, test, pd.DataFrame(future, index=X.iloc[test].index)))
    return prepared


def evaluate_model(name, X, y, years, folds, inner_folds=None, method="time_series"):
    truth, predicted, diagnostic, baseline = [], [], [], []
    details = []
    started = time.perf_counter()
    for number, (train, test, forecast_X) in enumerate(folds, 1):
        model = fit_tuned_model(name, X.iloc[train], y.iloc[train],
                                inner_folds[number - 1] if inner_folds else None)
        estimates = np.clip(model.predict(forecast_X), 0, 100)
        observed_input_estimates = np.clip(model.predict(X.iloc[test]), 0, 100)
        actual = y.iloc[test].to_numpy()
        truth.extend(actual)
        predicted.extend(estimates)
        diagnostic.extend(observed_input_estimates)
        baseline_value = float(y.iloc[train].mean()) if method == "kfold" else float(y.iloc[train[-1]])
        baseline.extend([baseline_value] * len(test))
        details.append({
            "fold": number, "train_size": len(train), "test_size": len(test),
            "train_years": f"{years.iloc[train].min()}-{years.iloc[train].max()}",
            "test_years": f"{years.iloc[test].min()}-{years.iloc[test].max()}",
            **compute_metrics(actual, estimates),
            "years": years.iloc[test].astype(int).tolist(),
            "actual": actual.tolist(), "predicted": estimates.tolist(),
        })
    metrics = compute_metrics(truth, predicted)
    return {**metrics, "fold_count": len(folds), "test_points": len(truth),
        "fold_results": details,
        "observed_input_metrics": compute_metrics(truth, diagnostic),
        ("mean_baseline" if method == "kfold" else "persistence_baseline"): compute_metrics(truth, baseline),
        "cv_elapsed_sec": round(time.perf_counter() - started, 3)}


def train_all_models():
    training_status.update(step="loading_dataset", progress=5, message="Loading actual and interpolated training data...")
    frame = get_training_frame()
    X, y, years = frame[FEATURE_COLUMNS], frame[TARGET_COLUMN], frame["year"]
    observed_mask = frame["source"].str.lower() != "interpolated"
    method = validation_method()
    if method == "kfold":
        training_status.update(step="preprocessing", progress=10, message="Preparing experimental shuffled K-fold validation...")
        folds = prepare_kfold(X)
        inner_folds = [prepare_kfold(X.iloc[tr]) for tr, _, _ in folds]
    else:
        # Validation must not read forecast batches generated with later information.
        indicator_X, indicator_years = get_forecast_input_data(include_forecasts=False)
        training_status.update(step="preprocessing", progress=10, message="Backtesting indicator forecasts...")
        cache = {}
        folds = prepare_validation(X, years, indicator_X, indicator_years, cache=cache, observed_mask=observed_mask)
        inner_folds = [prepare_validation(X.iloc[tr], years.iloc[tr], indicator_X, indicator_years,
                       min_train_size=3, cache=cache, allow_empty=True, observed_mask=observed_mask.iloc[tr]) for tr, _, _ in folds]
    results, fitted = {}, {}
    names = CONFIG["ml"]["active_models"]
    for index, name in enumerate(names):
        training_status.update(step="training", progress=int(15 + index / len(names) * 45),
            message=f"Validating {name} using {method}...")
        results[name] = evaluate_model(name, X, y, years, folds, inner_folds, method=method)
        results[name]["training_points"] = len(frame)
        results[name]["observed_training_points"] = int(observed_mask.sum())
        results[name]["interpolated_training_points"] = int((~observed_mask).sum())
        fitted[name] = fit_tuned_model(name, X, y, folds)
        print(f"[train] {name}: {results[name]}")
    # All candidates must succeed before replacing saved artifacts.
    training_status.update(step="saving", progress=62, message="Saving models...")
    with commit_section():
        SAVED_MODELS_DIR.mkdir(parents=True, exist_ok=True)
        for name, model in fitted.items():
            model.save(SAVED_MODELS_DIR / f"{name}.pkl")
    return fitted, results


if __name__ == "__main__":
    train_all_models()
