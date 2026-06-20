from __future__ import annotations

import argparse
import logging
import os
from collections.abc import Callable
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import joblib
from sklearn.inspection import permutation_importance

from src.evaluation.metrics import rank_models, regression_metrics
from src.features.preprocessing import (
    REGION_COL,
    TARGET_COL,
    YEAR_COL,
    chronological_train_test_split,
    create_lag_features,
    generate_mock_region_year_data,
    load_dataset,
    to_region_year,
)
from src.models.forecasting.arima import forecast_region_arima
from src.models.regressor.random_forest import build_random_forest
from src.models.regressor.ridge import build_ridge
from src.models.regressor.xgboost import build_xgboost


PROJECT_ROOT = Path(__file__).resolve().parent
DEFAULT_DATA = Path(os.getenv("POVERTY_DATA_PATH", PROJECT_ROOT / "data" / "raw" / "mock_poverty_raw.csv"))
LOGGER = logging.getLogger(__name__)
MODEL_ALIASES = {
    "auto": "auto",
    "ridge": "Ridge Regression",
    "ridge_regression": "Ridge Regression",
    "random_forest": "Random Forest Regressor",
    "random_forest_regressor": "Random Forest Regressor",
    "xgboost": "XGBoost Regressor",
    "xgboost_regressor": "XGBoost Regressor",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Regional poverty prediction pipeline")
    parser.add_argument("--data", type=Path, default=DEFAULT_DATA, help="CSV dataset path")
    parser.add_argument("--output-dir", type=Path, default=Path("outputs"), help="Output folder")
    parser.add_argument("--lags", type=int, nargs="+", default=[1, 2], help="Lag years to create")
    parser.add_argument("--forecast-periods", type=int, default=3, help="Future ARIMA forecast years")
    parser.add_argument("--test-years", type=int, default=3, help="Latest years used for evaluation")
    parser.add_argument("--cv-folds", type=int, default=5, help="Number of expanding-window time-series CV folds")
    parser.add_argument("--max-forecast-regions", type=int, default=6, help="Maximum regions shown in forecast plot")
    parser.add_argument("--log-file", type=Path, default=Path("outputs") / "pipeline.log", help="Pipeline log file")
    parser.add_argument(
        "--model",
        choices=["auto", "ridge", "random_forest", "xgboost"],
        default="auto",
        help="Model used for saved predictions. auto chooses the best model by metrics.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    output_dir = args.output_dir
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "figures").mkdir(exist_ok=True)
    configure_logging(output_dir / args.log_file.name)

    if args.data.exists():
        raw = load_dataset(args.data)
        source = str(args.data)
        LOGGER.info("Loaded dataset from %s", args.data)
    else:
        raw = generate_mock_region_year_data()
        source = "generated region-year mock data"
        LOGGER.warning("Data path %s not found. Generated mock region-year data.", args.data)

    region_year = to_region_year(raw)
    modeled, feature_cols = create_lag_features(region_year, lags=args.lags)
    train_df, test_df = chronological_train_test_split(modeled, test_years=args.test_years)

    X_train, y_train = train_df[feature_cols], train_df[TARGET_COL]
    X_test, y_test = test_df[feature_cols], test_df[TARGET_COL]

    model_builders = get_model_builders()
    models = {name: builder() for name, builder in model_builders.items()}

    metrics_by_model: dict[str, dict[str, float]] = {}
    predictions = test_df[[REGION_COL, YEAR_COL, TARGET_COL]].copy()
    fitted_models = {}

    for name, model in models.items():
        model.fit(X_train, y_train)
        pred = model.predict(X_test)
        predictions[f"{slug(name)}_prediction"] = pred
        metrics_by_model[name] = regression_metrics(y_test, pred)
        fitted_models[name] = model

    cv_results, cv_summary = time_series_cross_validate(
        modeled=modeled,
        feature_cols=feature_cols,
        model_builders=model_builders,
        n_folds=args.cv_folds,
    )

    model_ranking = rank_models(metrics_by_model)
    best_model_name = model_ranking.loc[0, "model"]
    selected_model_name = select_model_name(args.model, model_ranking)
    selected_model = fitted_models[selected_model_name]

    feature_ranking = get_feature_importance(selected_model, selected_model_name, X_test, y_test, feature_cols)
    future_predictions = predict_next_year_by_region(
        selected_model,
        selected_model_name,
        region_year,
        feature_cols,
    )

    forecasts = []
    for region, history in region_year.groupby(REGION_COL):
        forecasts.append(
            forecast_region_arima(history, region=region, periods=args.forecast_periods)
        )
    forecast_df = pd.concat(forecasts, ignore_index=True)

    region_year.to_csv(output_dir / "regional_poverty_dataset.csv", index=False)
    modeled.to_csv(output_dir / "lagged_model_dataset.csv", index=False)
    model_ranking.to_csv(output_dir / "model_comparison.csv", index=False)
    cv_results.to_csv(output_dir / "cross_validation_results.csv", index=False)
    cv_summary.to_csv(output_dir / "cross_validation_summary.csv", index=False)
    predictions.to_csv(output_dir / "test_predictions.csv", index=False)
    future_predictions.to_csv(output_dir / "future_predictions.csv", index=False)
    feature_ranking.to_csv(output_dir / "feature_importance.csv", index=False)
    forecast_df.to_csv(output_dir / "arima_forecasts.csv", index=False)

    model_dir = output_dir / "models"
    model_dir.mkdir(exist_ok=True)
    joblib.dump(selected_model, model_dir / "poverty_model.joblib")
    joblib.dump(selected_model, model_dir / "best_poverty_model.joblib")
    joblib.dump(
        {
            "best_model_name": best_model_name,
            "selected_model_name": selected_model_name,
            "model_selection": args.model,
            "cv_folds": args.cv_folds,
            "feature_columns": feature_cols,
            "lags": args.lags,
            "target_column": TARGET_COL,
            "region_column": REGION_COL,
            "year_column": YEAR_COL,
        },
        model_dir / "model_metadata.joblib",
    )

    plot_model_comparison(model_ranking, output_dir / "figures" / "model_comparison.png")
    plot_feature_importance(feature_ranking, output_dir / "figures" / "feature_importance.png")
    plot_forecasts(
        region_year,
        forecast_df,
        output_dir / "figures" / "arima_forecast_trends.png",
        max_regions=args.max_forecast_regions,
    )

    write_report(
        output_dir / "poverty_prediction_report.md",
        source=source,
        region_year=region_year,
        modeled=modeled,
        lags=args.lags,
        model_ranking=model_ranking,
        cv_summary=cv_summary,
        best_model_name=best_model_name,
        selected_model_name=selected_model_name,
        feature_ranking=feature_ranking,
        forecast_df=forecast_df,
        future_predictions=future_predictions,
    )

    LOGGER.info("Best model by metrics: %s", best_model_name)
    LOGGER.info("Selected model for prediction: %s", selected_model_name)
    LOGGER.info("Outputs written to: %s", output_dir.resolve())
    print(f"Best model by metrics: {best_model_name}")
    print(f"Selected model for prediction: {selected_model_name}")
    print(model_ranking.to_string(index=False))
    print("\nTime-series cross-validation summary:")
    print(cv_summary.to_string(index=False))
    print(f"Outputs written to: {output_dir.resolve()}")


def configure_logging(log_path: Path) -> None:
    log_path.parent.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler(log_path, encoding="utf-8"),
        ],
        force=True,
    )


def get_model_builders() -> dict[str, Callable]:
    return {
        "Ridge Regression": build_ridge,
        "Random Forest Regressor": build_random_forest,
        "XGBoost Regressor": build_xgboost,
    }


def time_series_cross_validate(
    modeled: pd.DataFrame,
    feature_cols: list[str],
    model_builders: dict[str, Callable],
    n_folds: int = 5,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    years = sorted(modeled[YEAR_COL].unique())
    if len(years) < 4:
        empty_cols = ["fold", "model", "train_start_year", "train_end_year", "test_year", "r2", "mae", "mse", "rmse", "mape"]
        return pd.DataFrame(columns=empty_cols), pd.DataFrame(columns=["model", "r2", "mae", "mse", "rmse", "mape", "folds"])

    test_years = years[-min(n_folds, len(years) - 2):]
    rows = []

    for fold_number, test_year in enumerate(test_years, start=1):
        train_df = modeled[modeled[YEAR_COL] < test_year]
        test_df = modeled[modeled[YEAR_COL] == test_year]
        if train_df.empty or test_df.empty:
            continue

        X_train, y_train = train_df[feature_cols], train_df[TARGET_COL]
        X_test, y_test = test_df[feature_cols], test_df[TARGET_COL]

        for model_name, builder in model_builders.items():
            model = builder()
            model.fit(X_train, y_train)
            pred = model.predict(X_test)
            metric_values = regression_metrics(y_test, pred)
            rows.append(
                {
                    "fold": fold_number,
                    "model": model_name,
                    "train_start_year": int(train_df[YEAR_COL].min()),
                    "train_end_year": int(train_df[YEAR_COL].max()),
                    "test_year": int(test_year),
                    **metric_values,
                }
            )

    cv_results = pd.DataFrame(rows)
    if cv_results.empty:
        return cv_results, pd.DataFrame(columns=["model", "r2", "mae", "mse", "rmse", "mape", "folds"])

    cv_summary = (
        cv_results.groupby("model", as_index=False)
        .agg(
            r2=("r2", "mean"),
            mae=("mae", "mean"),
            mse=("mse", "mean"),
            rmse=("rmse", "mean"),
            mape=("mape", "mean"),
            folds=("fold", "count"),
        )
        .sort_values(["r2", "rmse", "mae"], ascending=[False, True, True])
        .reset_index(drop=True)
    )
    return cv_results, cv_summary


def select_model_name(model_choice: str, model_ranking: pd.DataFrame) -> str:
    selected = MODEL_ALIASES[model_choice]
    if selected == "auto":
        return str(model_ranking.loc[0, "model"])
    return selected


def predict_next_year_by_region(
    model,
    model_name: str,
    region_year: pd.DataFrame,
    feature_cols: list[str],
) -> pd.DataFrame:
    rows = []
    for region, history in region_year.groupby(REGION_COL):
        history = history.sort_values(YEAR_COL)
        next_year = int(history[YEAR_COL].max()) + 1
        row = {}
        median_fallbacks = 0
        zero_fallbacks = 0
        for feature in feature_cols:
            base_indicator, lag_text = feature.rsplit("_lag_", 1)
            lag_year = next_year - int(lag_text)
            match = history[history[YEAR_COL] == lag_year]
            if not match.empty and base_indicator in match.columns:
                row[feature] = float(match.iloc[0][base_indicator])
            elif base_indicator in history.columns:
                row[feature] = float(history[base_indicator].median())
                median_fallbacks += 1
            else:
                row[feature] = 0.0
                zero_fallbacks += 1
        if median_fallbacks or zero_fallbacks:
            LOGGER.warning(
                "Prediction for %s year %s used fallback values: %s median fallback(s), %s zero fallback(s).",
                region,
                next_year,
                median_fallbacks,
                zero_fallbacks,
            )
        prediction = float(np.clip(model.predict(pd.DataFrame([row])[feature_cols])[0], 0, 100))
        rows.append(
            {
                REGION_COL: region,
                YEAR_COL: next_year,
                "model": model_name,
                "predicted_poverty_incidence": prediction,
            }
        )
    return pd.DataFrame(rows)


def get_feature_importance(model, model_name: str, X_test: pd.DataFrame, y_test: pd.Series, feature_cols: list[str]) -> pd.DataFrame:
    final_model = model.named_steps["model"] if hasattr(model, "named_steps") else model

    if hasattr(final_model, "feature_importances_"):
        importance = np.asarray(final_model.feature_importances_, dtype=float)
        method = "model_importance"
    elif hasattr(final_model, "coef_"):
        importance = np.abs(np.asarray(final_model.coef_, dtype=float))
        method = "absolute_coefficient"
    else:
        perm = permutation_importance(model, X_test, y_test, n_repeats=10, random_state=42, n_jobs=-1)
        importance = perm.importances_mean
        method = "permutation_importance"

    table = pd.DataFrame(
        {
            "feature": feature_cols,
            "importance": importance,
            "method": method,
            "model": model_name,
        }
    )
    total = table["importance"].abs().sum()
    table["importance_pct"] = np.where(total > 0, table["importance"].abs() / total * 100, 0)
    table["base_indicator"] = table["feature"].str.replace(r"_lag_\d+$", "", regex=True)
    table["lag"] = table["feature"].str.extract(r"_lag_(\d+)$").astype(int)
    return table.sort_values("importance_pct", ascending=False).reset_index(drop=True)


def plot_model_comparison(model_ranking: pd.DataFrame, path: Path) -> None:
    fig, ax = plt.subplots(figsize=(9, 5))
    ax.barh(model_ranking["model"], model_ranking["rmse"], color=["#2f6f73", "#8a5a44", "#bf8b2e"])
    ax.invert_yaxis()
    ax.set_xlabel("RMSE")
    ax.set_title("Model Comparison: Lower RMSE Is Better")
    ax.grid(axis="x", alpha=0.25)
    fig.tight_layout()
    fig.savefig(path, dpi=160)
    plt.close(fig)


def plot_feature_importance(feature_ranking: pd.DataFrame, path: Path, top_n: int = 15) -> None:
    top = feature_ranking.head(top_n).iloc[::-1]
    fig, ax = plt.subplots(figsize=(10, 7))
    ax.barh(top["feature"], top["importance_pct"], color="#3f6c9a")
    ax.set_xlabel("Contribution share (%)")
    ax.set_title("Top Socioeconomic Indicator Contributions")
    ax.grid(axis="x", alpha=0.25)
    fig.tight_layout()
    fig.savefig(path, dpi=160)
    plt.close(fig)


def plot_forecasts(
    region_year: pd.DataFrame,
    forecast_df: pd.DataFrame,
    path: Path,
    max_regions: int | None = 6,
) -> None:
    regions = forecast_df[REGION_COL].unique()
    if max_regions is not None and len(regions) > max_regions:
        LOGGER.warning(
            "Forecast plot includes %s of %s regions. Increase --max-forecast-regions to show more.",
            max_regions,
            len(regions),
        )
        regions = regions[:max_regions]
    fig, ax = plt.subplots(figsize=(11, 6))
    for region in regions:
        hist = region_year[region_year[REGION_COL] == region].sort_values(YEAR_COL)
        future = forecast_df[forecast_df[REGION_COL] == region].sort_values(YEAR_COL)
        ax.plot(hist[YEAR_COL], hist[TARGET_COL], marker="o", linewidth=1.7, label=f"{region} history")
        ax.plot(future[YEAR_COL], future["forecast"], marker="s", linestyle="--", linewidth=1.7, label=f"{region} forecast")
        ax.fill_between(future[YEAR_COL], future["lower_ci"], future["upper_ci"], alpha=0.08)
    ax.set_xlabel("Year")
    ax.set_ylabel("Poverty incidence (%)")
    ax.set_title("ARIMA 3-Year Poverty Incidence Forecast")
    ax.grid(alpha=0.25)
    ax.legend(ncol=2, fontsize=8)
    fig.tight_layout()
    fig.savefig(path, dpi=160)
    plt.close(fig)


def write_report(
    path: Path,
    source: str,
    region_year: pd.DataFrame,
    modeled: pd.DataFrame,
    lags: list[int],
    model_ranking: pd.DataFrame,
    cv_summary: pd.DataFrame,
    best_model_name: str,
    selected_model_name: str,
    feature_ranking: pd.DataFrame,
    forecast_df: pd.DataFrame,
    future_predictions: pd.DataFrame,
) -> None:
    tables = prepare_report_tables(
        model_ranking=model_ranking,
        cv_summary=cv_summary,
        feature_ranking=feature_ranking,
        forecast_df=forecast_df,
        future_predictions=future_predictions,
    )
    report = build_report_text(
        source=source,
        region_year=region_year,
        modeled=modeled,
        lags=lags,
        best_model_name=best_model_name,
        selected_model_name=selected_model_name,
        tables=tables,
    )
    path.write_text(report, encoding="utf-8")


def prepare_report_tables(
    model_ranking: pd.DataFrame,
    cv_summary: pd.DataFrame,
    feature_ranking: pd.DataFrame,
    forecast_df: pd.DataFrame,
    future_predictions: pd.DataFrame,
) -> dict[str, pd.DataFrame]:
    comparison = round_columns(model_ranking.copy(), ["r2", "mae", "mse", "rmse", "mape"], 4)
    cv_table = round_columns(cv_summary.copy(), ["r2", "mae", "mse", "rmse", "mape"], 4)
    top_features = feature_ranking.head(10)[["feature", "importance_pct"]].copy()
    top_features = round_columns(top_features, ["importance_pct"], 2)
    forecast_preview = round_columns(forecast_df.head(15).copy(), ["forecast", "lower_ci", "upper_ci"], 2)
    future_preview = round_columns(future_predictions.copy(), ["predicted_poverty_incidence"], 2)
    return {
        "comparison": comparison,
        "cv_summary": cv_table,
        "top_features": top_features,
        "forecast_preview": forecast_preview,
        "future_preview": future_preview,
    }


def round_columns(df: pd.DataFrame, columns: list[str], decimals: int) -> pd.DataFrame:
    for col in columns:
        if col in df:
            df[col] = df[col].round(decimals)
    return df


def build_report_text(
    source: str,
    region_year: pd.DataFrame,
    modeled: pd.DataFrame,
    lags: list[int],
    best_model_name: str,
    selected_model_name: str,
    tables: dict[str, pd.DataFrame],
) -> str:
    return f"""# Machine Learning-Based Regional Poverty Prediction

## Dataset

- Source: {source}
- Regional records: {len(region_year):,}
- Model rows after lagging: {len(modeled):,}
- Regions: {region_year[REGION_COL].nunique():,}
- Years: {int(region_year[YEAR_COL].min())}-{int(region_year[YEAR_COL].max())}
- Lag features: {", ".join("Lag " + str(lag) for lag in lags)}

## Model Comparison

{to_markdown_table(tables["comparison"])}

## Time-Series Cross-Validation

{to_markdown_table(tables["cv_summary"])}

Best model by metrics: **{best_model_name}**

Selected model used for saved predictions: **{selected_model_name}**

## Top Indicator Contributions

{to_markdown_table(tables["top_features"])}

## ARIMA Forecast Preview

{to_markdown_table(tables["forecast_preview"])}

## Automatic Next-Year ML Predictions

{to_markdown_table(tables["future_preview"])}

## Architecture

1. Data collection layer: reads a household-level mock CSV, a future region-year CSV, or generated mock data.
2. Data preprocessing layer: aggregates household data into region-year poverty incidence and socioeconomic indicators.
3. Feature engineering layer: creates dynamic lag features for indicators and historical poverty incidence.
4. Model training module: trains Ridge Regression, Random Forest Regressor, and XGBoost Regressor.
5. Model evaluation module: computes R2, MAE, MSE, RMSE, MAPE, chronological testing, and expanding-window time-series cross-validation.
6. Feature importance module: ranks indicator contributions using model importances or coefficients.
7. ARIMA forecasting module: forecasts the next 3 years and confidence intervals for each region.
8. Visualization and reporting module: exports comparison, importance, forecast tables, charts, and this report.

## Replacing Mock Data With Real Data

Use a CSV with `region`, `year`, and either `poverty_incidence` or household-level `is_poor`.
Additional numeric socioeconomic indicators can be added as columns; the lag generator will include them automatically.
"""


def slug(text: str) -> str:
    return text.lower().replace(" ", "_").replace("-", "_")


def to_markdown_table(df: pd.DataFrame) -> str:
    headers = [str(col) for col in df.columns]
    rows = []
    rows.append("| " + " | ".join(headers) + " |")
    rows.append("| " + " | ".join(["---"] * len(headers)) + " |")
    for _, row in df.iterrows():
        rows.append("| " + " | ".join(str(row[col]) for col in df.columns) + " |")
    return "\n".join(rows)


if __name__ == "__main__":
    main()
