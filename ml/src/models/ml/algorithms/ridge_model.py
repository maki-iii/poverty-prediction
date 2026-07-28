"""
Ridge regression implementation of BaseModel.

Ridge is sensitive to feature scale, so this wraps it in a pipeline with
StandardScaler -- the 12 indicators have very different scales (income
in the hundreds of thousands vs. percentages 0-100), which would
otherwise bias the regularization penalty toward large-scale features.
"""

from sklearn.linear_model import Ridge
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from src.models.ml.base_model import BaseModel


class RidgeModel(BaseModel):
    name = "ridge"

    def _build_model(self):
        return Pipeline([
            ("scaler", StandardScaler()),
            ("ridge", Ridge(
                alpha=self.hyperparameters.get("alpha", 1.0),
                random_state=self.hyperparameters.get("random_state", 42),
            )),
        ])