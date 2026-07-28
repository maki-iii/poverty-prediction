"""
XGBoost regressor implementation of BaseModel.
"""

from xgboost import XGBRegressor

from src.models.ml.base_model import BaseModel


class XGBoostModel(BaseModel):
    name = "xgboost"

    def _build_model(self):
        return XGBRegressor(
            n_estimators=self.hyperparameters.get("n_estimators", 300),
            max_depth=self.hyperparameters.get("max_depth", 4),
            learning_rate=self.hyperparameters.get("learning_rate", 0.05),
            subsample=self.hyperparameters.get("subsample", 0.8),
            colsample_bytree=self.hyperparameters.get("colsample_bytree", 0.8),
            random_state=self.hyperparameters.get("random_state", 42),
            objective="reg:squarederror",
        )