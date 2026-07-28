"""
Abstract base class defining the common interface every ML model
(XGBoost, Ridge, Random Forest) must implement.

train.py and evaluate.py only ever talk to this interface -- they never
know or care which specific algorithm is underneath. This is what makes
adding a new model later a matter of creating one new file, not touching
existing pipeline code.
"""

from abc import ABC, abstractmethod
from pathlib import Path

import joblib
import pandas as pd


class BaseModel(ABC):
    """
    Every concrete model (XGBoostModel, RidgeModel, RandomForestModel)
    subclasses this and implements _build_model().
    """

    name: str = "base"  # overridden by each subclass, e.g. "xgboost"

    def __init__(self, hyperparameters: dict):
        self.hyperparameters = hyperparameters
        self.model = self._build_model()

    @abstractmethod
    def _build_model(self):
        """Returns an unfitted sklearn-compatible estimator instance."""
        raise NotImplementedError

    def fit(self, X: pd.DataFrame, y: pd.Series):
        self.model.fit(X, y)
        return self

    def predict(self, X: pd.DataFrame):
        return self.model.predict(X)

    def save(self, path: str | Path):
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(self.model, path)

    def load(self, path: str | Path):
        self.model = joblib.load(path)
        return self

    def get_params(self) -> dict:
        return self.hyperparameters

    def __repr__(self):
        return f"<{self.__class__.__name__} name={self.name} params={self.hyperparameters}>"