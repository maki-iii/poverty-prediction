from xgboost import XGBRegressor

from config.settings import MODEL_RANDOM_STATE


def build_model():
    return XGBRegressor(
        objective="reg:squarederror",
        random_state=MODEL_RANDOM_STATE,
        n_jobs=-1
    )


def get_param_grid():
    return {
        "n_estimators": [100, 200, 300],
        "learning_rate": [0.01, 0.05, 0.1],
        "max_depth": [2, 3, 4, 5],
        "subsample": [0.7, 0.8, 1.0],
        "colsample_bytree": [0.7, 0.8, 1.0],
    }