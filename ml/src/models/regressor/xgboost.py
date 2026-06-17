from __future__ import annotations


def build_xgboost():
    try:
        from xgboost import XGBRegressor
    except ImportError as exc:
        raise ImportError(
            "xgboost is not installed. Install it or remove XGBoost from the model list."
        ) from exc

    return XGBRegressor(
        objective="reg:squarederror",
        n_estimators=450,
        learning_rate=0.04,
        max_depth=3,
        subsample=0.9,
        colsample_bytree=0.9,
        reg_lambda=1.0,
        random_state=42,
        n_jobs=-1,
    )
