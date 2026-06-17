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
python run_pipeline.py --data "C:\Users\Dell\Downloads\Capstone\mock_data\mock_poverty_raw.csv" --output-dir "outputs"
```

If the data path is missing, the pipeline generates region-year mock data automatically.

Choose which model to use for saved predictions:

```powershell
python run_pipeline.py --model auto
python run_pipeline.py --model ridge
python run_pipeline.py --model random_forest
python run_pipeline.py --model xgboost
```

`auto` compares all models and uses the best-performing model. The other options force the selected model.

## Output Files

- `outputs/regional_poverty_dataset.csv`
- `outputs/lagged_model_dataset.csv`
- `outputs/model_comparison.csv`
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
