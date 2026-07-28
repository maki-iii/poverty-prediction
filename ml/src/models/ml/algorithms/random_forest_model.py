"""
Random Forest regressor implementation of BaseModel.
"""

from sklearn.ensemble import RandomForestRegressor

from src.models.ml.base_model import BaseModel


class RandomForestModel(BaseModel):
    name = "random_forest"

    def _build_model(self):
        return RandomForestRegressor(
            n_estimators=self.hyperparameters.get("n_estimators", 300),
            max_depth=self.hyperparameters.get("max_depth", 6),
            min_samples_leaf=self.hyperparameters.get("min_samples_leaf", 2),
            random_state=self.hyperparameters.get("random_state", 42),
        )