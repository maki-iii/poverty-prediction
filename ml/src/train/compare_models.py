import joblib
import pandas as pd

from sklearn.model_selection import TimeSeriesSplit, RandomizedSearchCV
from sklearn.metrics import make_scorer, mean_absolute_error

from config.settings import (
    FEATURE_DATA_PATH,
    METRICS_PATH,
    BEST_MODEL_PATH,
    YEAR_COLUMN,
    REGION_COLUMN,
    TARGET_COLUMN,
    MODEL_RANDOM_STATE,
)

from src.evaluate import evaluate_regression_model
from src.train.ridge import build_model as build_ridge, get_param_grid as ridge_params
from src.train.random_forest import build_model as build_rf, get_param_grid as rf_params
from src.train.xgboost import build_model as build_xgb, get_param_grid as xgb_params


def load_feature_data():
    return pd.read_csv(FEATURE_DATA_PATH)


def get_training_columns(df):
    excluded = [
        YEAR_COLUMN,
        REGION_COLUMN,
        TARGET_COLUMN,
    ]

    return [
        col for col in df.columns
        if col not in excluded
    ]


def split_train_test_by_year(df):
    df = df.sort_values(YEAR_COLUMN)

    latest_year = df[YEAR_COLUMN].max()

    train_df = df[df[YEAR_COLUMN] < latest_year]
    test_df = df[df[YEAR_COLUMN] == latest_year]

    return train_df, test_df, latest_year


def tune_model(model, param_grid, X_train, y_train):
    cv = TimeSeriesSplit(n_splits=3)

    scorer = make_scorer(
        mean_absolute_error,
        greater_is_better=False
    )

    search = RandomizedSearchCV(
        estimator=model,
        param_distributions=param_grid,
        n_iter=10,
        scoring=scorer,
        cv=cv,
        random_state=MODEL_RANDOM_STATE,
        n_jobs=-1,
        error_score="raise"
    )

    search.fit(X_train, y_train)

    return search.best_estimator_, search.best_params_, abs(search.best_score_)


def train_and_compare_models():
    df = load_feature_data()

    train_df, test_df, latest_year = split_train_test_by_year(df)

    feature_columns = get_training_columns(df)

    X_train = train_df[feature_columns]
    y_train = train_df[TARGET_COLUMN]

    X_test = test_df[feature_columns]
    y_test = test_df[TARGET_COLUMN]

    models = {
        "Ridge Regression": {
            "model": build_ridge(),
            "params": ridge_params(),
        },
        "Random Forest Regressor": {
            "model": build_rf(),
            "params": rf_params(),
        },
        "XGBoost Regressor": {
            "model": build_xgb(),
            "params": xgb_params(),
        },
    }

    results = []
    trained_models = {}

    for model_name, model_info in models.items():
        print(f"Training {model_name}...")

        best_model, best_params, cv_mae = tune_model(
            model_info["model"],
            model_info["params"],
            X_train,
            y_train
        )

        y_pred = best_model.predict(X_test)

        metrics = evaluate_regression_model(
            y_test,
            y_pred
        )

        result = {
            "model": model_name,
            "test_year": latest_year,
            "cv_mae": cv_mae,
            "test_mae": metrics["MAE"],
            "test_rmse": metrics["RMSE"],
            "test_r2": metrics["R2"],
            "test_mape": metrics["MAPE"],
            "best_params": best_params,
        }

        results.append(result)
        trained_models[model_name] = best_model

        print(f"{model_name} completed.")
        print(f"MAE: {metrics['MAE']:.4f}")
        print(f"RMSE: {metrics['RMSE']:.4f}")
        print(f"R2: {metrics['R2']:.4f}")
        print("-" * 40)

    results_df = pd.DataFrame(results)

    best_row = results_df.sort_values(
        by=["test_mae", "test_rmse"],
        ascending=True
    ).iloc[0]

    best_model_name = best_row["model"]
    best_model = trained_models[best_model_name]

    METRICS_PATH.parent.mkdir(parents=True, exist_ok=True)
    BEST_MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)

    results_df.to_csv(METRICS_PATH, index=False)
    joblib.dump(best_model, BEST_MODEL_PATH)

    print("Model comparison completed.")
    print(f"Metrics saved to: {METRICS_PATH}")
    print(f"Best model: {best_model_name}")
    print(f"Best model saved to: {BEST_MODEL_PATH}")

    return best_model, results_df


if __name__ == "__main__":
    train_and_compare_models()