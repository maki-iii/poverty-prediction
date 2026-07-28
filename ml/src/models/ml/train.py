"""
Trains every model listed in configs/config.yaml's ml.active_models,
using actuals from the database (via preprocess.load_clean).

Splits into train/test, fits each model on the training set, and saves
each fitted model to saved_models/ml/<name>.pkl. evaluate.py then scores
each one on the held-out test set to pick the best.

Usage (from the ml/ folder):
    python -m src.models.ml.train
"""

from pathlib import Path

import yaml
from sklearn.model_selection import train_test_split

from src.preprocess.load_clean import get_training_data
from src.models.ml.model_factory import get_active_models

PROJECT_ROOT = Path(__file__).resolve().parents[3]  # ml/src/models/ml/train.py -> ml/
SAVED_MODELS_DIR = PROJECT_ROOT / "saved_models" / "ml"

with open(PROJECT_ROOT / "configs" / "config.yaml", "r") as f:
    CONFIG = yaml.safe_load(f)

TEST_SIZE = CONFIG["ml"]["test_size"]
RANDOM_STATE = CONFIG["ml"]["random_state"]


def split_data(X, y):
    """
    Train/test split. Random split (not time-based) since the dataset
    is small (27 rows) and the goal is a fair comparison across models,
    not a temporal backtest.
    """
    return train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE
    )


def train_all_models():
    """
    Trains every active model on the same train/test split, saves each
    fitted model to disk, and returns everything evaluate.py needs.

    Returns:
        fitted_models (dict): {model_name: fitted BaseModel instance}
        X_train, X_test, y_train, y_test
    """
    X, y, years = get_training_data()
    X_train, X_test, y_train, y_test = split_data(X, y)

    SAVED_MODELS_DIR.mkdir(parents=True, exist_ok=True)

    fitted_models = {}
    for model in get_active_models():
        print(f"[train] Fitting {model.name}...")
        model.fit(X_train, y_train)

        save_path = SAVED_MODELS_DIR / f"{model.name}.pkl"
        model.save(save_path)
        print(f"[train] Saved {model.name} -> {save_path}")

        fitted_models[model.name] = model

    return fitted_models, X_train, X_test, y_train, y_test


if __name__ == "__main__":
    fitted_models, X_train, X_test, y_train, y_test = train_all_models()
    print(f"\n[train] Trained {len(fitted_models)} models: {list(fitted_models.keys())}")
    print(f"[train] Train size: {len(X_train)}, Test size: {len(X_test)}")