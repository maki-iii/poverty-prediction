"""
Dynamic model loader: reads configs/config.yaml's active_models list and
returns instantiated model objects, without train.py or evaluate.py ever
needing to hardcode which algorithms exist.

To add a new model later:
    1. create src/models/ml/algorithms/<name>_model.py implementing BaseModel
    2. register it in the _REGISTRY dict below
    3. add its name + hyperparameters to configs/config.yaml
"""

from pathlib import Path

import yaml

from src.models.ml.algorithms.xgboost_model import XGBoostModel
from src.models.ml.algorithms.ridge_model import RidgeModel
from src.models.ml.algorithms.random_forest_model import RandomForestModel

PROJECT_ROOT = Path(__file__).resolve().parents[3]  # ml/src/models/ml/model_factory.py -> ml/

with open(PROJECT_ROOT / "configs" / "config.yaml", "r") as f:
    CONFIG = yaml.safe_load(f)

# Maps config name -> model class. This is the ONLY place that needs
# updating when a new algorithm file is added.
_REGISTRY = {
    "xgboost": XGBoostModel,
    "ridge": RidgeModel,
    "random_forest": RandomForestModel,
}


def get_model(name: str):
    """Returns an instantiated (unfitted) model for the given config name."""
    if name not in _REGISTRY:
        raise ValueError(
            f"Unknown model '{name}'. Registered models: {list(_REGISTRY.keys())}"
        )
    hyperparams = CONFIG["ml"]["hyperparameters"].get(name, {})
    model_class = _REGISTRY[name]
    return model_class(hyperparams)


def get_active_models() -> list:
    """
    Returns a list of instantiated models for every entry in
    configs/config.yaml's ml.active_models list.
    """
    active_names = CONFIG["ml"]["active_models"]
    return [get_model(name) for name in active_names]