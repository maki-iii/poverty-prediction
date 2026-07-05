from sklearn.ensemble import RandomForestRegressor

from config.settings import MODEL_RANDOM_STATE


def build_model():
    return RandomForestRegressor(
        random_state=MODEL_RANDOM_STATE,
        n_jobs=-1
    )


def get_param_grid():
    return {
        "n_estimators": [100, 200, 300],
        "max_depth": [None, 5, 10, 20],
        "min_samples_split": [2, 5, 10],
        "min_samples_leaf": [1, 2, 4],
    }