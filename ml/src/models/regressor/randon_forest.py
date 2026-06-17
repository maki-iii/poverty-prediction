from sklearn.ensemble import RandomForestRegressor


def build_random_forest() -> RandomForestRegressor:
    return RandomForestRegressor(
        n_estimators=350,
        max_depth=None,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1,
    )
