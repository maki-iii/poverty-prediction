# Machine Learning-Based Regional Poverty Prediction

This project predicts regional poverty incidence from socioeconomic indicators using dynamic lag features.
It starts from mock household data, aggregates it into region-year indicators, compares regression models, ranks variables, and produces ARIMA-style 3-year poverty forecasts.

## What It Builds

- Regression models: Ridge Regression, Random Forest Regressor, XGBoost Regressor
- Dynamic lag features: default Lag 1 and Lag 2
- Metrics: R2, MAE, MSE, RMSE, MAPE
- Best-model selection
- Feature importance and variable ranking
- ARIMA forecasting with confidence intervals
- CSV outputs, charts, and a Markdown report

## Run

```powershell
python run_pipeline.py --data "data\raw\mock_poverty_raw.csv" --output-dir "outputs"
```

If the data path is missing, the pipeline generates region-year mock data automatically.
You can also set `POVERTY_DATA_PATH` to point to another CSV without changing the code.

Choose which model to use for saved predictions:

```powershell
python run_pipeline.py --model auto
python run_pipeline.py --model ridge
python run_pipeline.py --model random_forest
python run_pipeline.py --model xgboost
```

`auto` compares all models and uses the best-performing model. The other options force the selected model.

Run with time-series cross-validation:

```powershell
python run_pipeline.py --model auto --cv-folds 5
```

Cross-validation uses an expanding-window setup, where older years are used for training and the next year is used for testing.
The pipeline writes logs to `outputs/pipeline.log`.

## Output Files

- `outputs/regional_poverty_dataset.csv`
- `outputs/lagged_model_dataset.csv`
- `outputs/model_comparison.csv`
- `outputs/cross_validation_results.csv`
- `outputs/cross_validation_summary.csv`
- `outputs/test_predictions.csv`
- `outputs/future_predictions.csv`
- `outputs/feature_importance.csv`
- `outputs/arima_forecasts.csv`
- `outputs/poverty_prediction_report.md`
- `outputs/models/best_poverty_model.joblib`
- `outputs/models/poverty_model.joblib`
- `outputs/models/model_metadata.joblib`
- `outputs/figures/model_comparison.png`
- `outputs/figures/feature_importance.png`
- `outputs/figures/arima_forecast_trends.png`

## Real Dataset Swap

For future real data, provide a CSV with:

- `region`
- `year`
- `poverty_incidence`

Any additional numeric socioeconomic indicators will be lagged automatically. Household-level data is also supported when it contains `region`, `year`, and `is_poor`.

## API Endpoints

Start the API:

```powershell
python -m src.api.app
```

Base URL:

```text
http://127.0.0.1:5000
```

Available endpoints:

- `GET /health`
- `GET /api/metrics`
- `GET /api/metrics/feature-importance?top_n=10`
- `GET /api/forecast?region=NCR&periods=3`
- `POST /api/forecast`
- `POST /api/predict`
- `POST /api/upload`
- `POST /api/preprocess`
- `POST /api/train`
- `POST /api/predict/next-year`
- `POST /api/train/upload`

Prediction example:

```powershell
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:5000/api/predict" -ContentType "application/json" -Body '{"region":"NCR","year":2022}'
```

Prediction with a selected model:

```json
{
  "region": "NCR",
  "year": 2022,
  "model": "random_forest"
}
```

Manual lag prediction example:

```json
{
  "region": "NCR",
  "year": 2026,
  "lag_1": {
    "poverty_incidence": 37.1,
    "employment_rate": 91.4,
    "household_income": 180000
  },
  "lag_2": {
    "poverty_incidence": 38.2,
    "employment_rate": 90.8,
    "household_income": 171000
  }
}
```

Forecast example:

```powershell
Invoke-RestMethod "http://127.0.0.1:5000/api/forecast?region=NCR&periods=3"
```

Upload CSV, train all models, save the selected model, and auto-predict next year:

```powershell
Invoke-RestMethod -Method Post `
  -Uri "http://127.0.0.1:5000/api/train/upload" `
  -Form @{
    file = Get-Item "data\raw\mock_poverty_raw.csv"
    model = "auto"
    lags = "1,2"
  }
```

In Postman, use:

- Method: `POST`
- URL: `http://127.0.0.1:5000/api/train/upload`
- Body: `form-data`
- Key `file`: type `File`, choose your CSV
- Key `model`: type `Text`, value `auto`, `ridge`, `random_forest`, or `xgboost`
- Key `lags`: type `Text`, value `1,2`

The endpoint returns model metrics and next-year predictions, then saves:

- `data/raw/latest_training_data.csv`
- `outputs/future_predictions.csv`
- `outputs/models/poverty_model.joblib`
- `outputs/models/model_metadata.joblib`

Separated API workflow:

1. Upload only

```text
POST http://127.0.0.1:5000/api/upload
```

Postman Body: `form-data`

| Key | Type | Value |
|---|---|---|
| `file` | File | choose your CSV |

2. Preprocess only

```text
POST http://127.0.0.1:5000/api/preprocess
```

Postman Body: `raw` JSON

```json
{
  "lags": "1,2"
}
```

3. Train only, with model selection

```text
POST http://127.0.0.1:5000/api/train
```

Postman Body: `raw` JSON

```json
{
  "model": "auto",
  "lags": "1,2"
}
```

Allowed model values:

```text
auto
ridge
random_forest
xgboost
```

Training also automatically saves next-year predictions to:

```text
outputs/future_predictions.csv
```

4. Generate next-year prediction separately

```text
POST http://127.0.0.1:5000/api/predict/next-year
```

Postman Body: `raw` JSON

```json
{
  "model": "ridge",
  "lags": "1,2"
}
```
