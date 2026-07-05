from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import Ridge


def build_model():
    return Pipeline([
        ("scaler", StandardScaler()),
        ("model", Ridge())
    ])


def get_param_grid():
    return {
        "model__alpha": [0.01, 0.1, 1.0, 10.0, 100.0]
    }