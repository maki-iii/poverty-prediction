# Machine Learning-Based Regional Poverty Prediction

## Dataset

- Source: C:\Users\Dell\Downloads\Capstone\mock_data\mock_poverty_raw.csv
- Regional records: 357
- Model rows after lagging: 323
- Regions: 17
- Years: 1961-2021
- Lag features: Lag 1, Lag 2

## Model Comparison

| model | r2 | mae | mse | rmse | mape |
| --- | --- | --- | --- | --- | --- |
| Ridge Regression | 0.8302 | 3.5195 | 22.9787 | 4.7936 | 5.3655 |
| Random Forest Regressor | 0.7925 | 4.0286 | 28.0818 | 5.2992 | 6.5379 |
| XGBoost Regressor | 0.7576 | 4.1828 | 32.8109 | 5.7281 | 6.925 |

Best model by metrics: **Ridge Regression**

Selected model used for saved predictions: **Ridge Regression**

## Top Indicator Contributions

| feature | importance_pct |
| --- | --- |
| urban_share_lag_2 | 8.03 |
| household_income_lag_1 | 6.04 |
| grdp_lag_1 | 6.04 |
| urban_share_lag_1 | 5.0 |
| poverty_incidence_lag_1 | 4.85 |
| per_capita_income_lag_2 | 4.5 |
| population_proxy_lag_2 | 4.09 |
| family_size_lag_2 | 4.09 |
| agricultural_income_lag_2 | 3.36 |
| total_expenditure_lag_1 | 2.94 |

## ARIMA Forecast Preview

| year | forecast | lower_ci | upper_ci | region | method |
| --- | --- | --- | --- | --- | --- |
| 2022 | 87.62 | 83.31 | 91.94 | BARMM | fallback_arima_1_1_1 |
| 2023 | 86.64 | 80.54 | 92.74 | BARMM | fallback_arima_1_1_1 |
| 2024 | 86.24 | 78.76 | 93.71 | BARMM | fallback_arima_1_1_1 |
| 2022 | 70.86 | 64.25 | 77.48 | CAR | fallback_arima_1_1_1 |
| 2023 | 70.14 | 60.78 | 79.5 | CAR | fallback_arima_1_1_1 |
| 2024 | 69.0 | 57.54 | 80.47 | CAR | fallback_arima_1_1_1 |
| 2022 | 73.95 | 67.23 | 80.68 | CARAGA | fallback_arima_1_1_1 |
| 2023 | 75.31 | 65.79 | 84.82 | CARAGA | fallback_arima_1_1_1 |
| 2024 | 73.19 | 61.54 | 84.84 | CARAGA | fallback_arima_1_1_1 |
| 2022 | 39.37 | 30.82 | 47.91 | NCR | fallback_arima_1_1_1 |
| 2023 | 38.21 | 26.13 | 50.3 | NCR | fallback_arima_1_1_1 |
| 2024 | 37.1 | 22.3 | 51.9 | NCR | fallback_arima_1_1_1 |
| 2022 | 70.72 | 65.2 | 76.24 | Region I | fallback_arima_1_1_1 |
| 2023 | 70.32 | 62.51 | 78.12 | Region I | fallback_arima_1_1_1 |
| 2024 | 69.33 | 59.77 | 78.89 | Region I | fallback_arima_1_1_1 |

## Automatic Next-Year ML Predictions

| region | year | model | predicted_poverty_incidence |
| --- | --- | --- | --- |
| BARMM | 2022 | Ridge Regression | 92.9 |
| CAR | 2022 | Ridge Regression | 79.81 |
| CARAGA | 2022 | Ridge Regression | 89.08 |
| NCR | 2022 | Ridge Regression | 46.37 |
| Region I | 2022 | Ridge Regression | 81.19 |
| Region II | 2022 | Ridge Regression | 84.5 |
| Region III | 2022 | Ridge Regression | 70.24 |
| Region IV-A | 2022 | Ridge Regression | 65.23 |
| Region IV-B | 2022 | Ridge Regression | 86.08 |
| Region IX | 2022 | Ridge Regression | 87.72 |
| Region V | 2022 | Ridge Regression | 86.51 |
| Region VI | 2022 | Ridge Regression | 83.25 |
| Region VII | 2022 | Ridge Regression | 78.04 |
| Region VIII | 2022 | Ridge Regression | 88.79 |
| Region X | 2022 | Ridge Regression | 77.36 |
| Region XI | 2022 | Ridge Regression | 72.89 |
| Region XII | 2022 | Ridge Regression | 81.64 |

## Architecture

1. Data collection layer: reads a household-level mock CSV, a future region-year CSV, or generated mock data.
2. Data preprocessing layer: aggregates household data into region-year poverty incidence and socioeconomic indicators.
3. Feature engineering layer: creates dynamic lag features for indicators and historical poverty incidence.
4. Model training module: trains Ridge Regression, Random Forest Regressor, and XGBoost Regressor.
5. Model evaluation module: computes R2, MAE, MSE, RMSE, and MAPE with chronological testing.
6. Feature importance module: ranks indicator contributions using model importances or coefficients.
7. ARIMA forecasting module: forecasts the next 3 years and confidence intervals for each region.
8. Visualization and reporting module: exports comparison, importance, forecast tables, charts, and this report.

## Replacing Mock Data With Real Data

Use a CSV with `region`, `year`, and either `poverty_incidence` or household-level `is_poor`.
Additional numeric socioeconomic indicators can be added as columns; the lag generator will include them automatically.
