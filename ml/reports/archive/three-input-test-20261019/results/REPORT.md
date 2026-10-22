# Small-data evaluation — test only

History: 9 survey years plus 16 interpolated years.
Actual survey years: 1997, 2000, 2003, 2006, 2009, 2012, 2015, 2018, 2021.

Scores below evaluate forecast indicators followed by ML against actual poverty observations.
Displayed numbers are truncated to two decimals; JSON retains full precision.

| Candidate | RMSE | MAE | R² | Actual targets |
|---|---:|---:|---:|---:|
| random_forest/arima | 0.65 | 0.44 | -0.49 | 4 |
| random_forest/past_selected | 0.65 | 0.45 | -0.49 | 4 |
| xgboost/arima | 0.79 | 0.62 | -1.17 | 4 |
| xgboost/past_selected | 0.81 | 0.64 | -1.28 | 4 |
| poverty_last_value | 0.81 | 0.65 | -1.33 | 4 |
| poverty_drift | 0.97 | 0.94 | -2.33 | 4 |
| ridge/arima | 0.99 | 0.71 | -2.42 | 4 |
| ridge/past_selected | 0.99 | 0.80 | -2.44 | 4 |

Best ML candidate in this test: **random_forest/arima**.
Best candidate including simple poverty baselines: **random_forest/arima**.

## Historical windows

| Trained through | Actual target years |
|---|---|
| 2009 | 2012 |
| 2012 | 2015 |
| 2015 | 2018 |
| 2018 | 2021 |

## Indicator forecasting comparison

| Indicator | Method | RMSE | MAE |
|---|---|---:|---:|
| avg_family_size | arima | 0.24 | 0.23 |
| avg_family_size | drift | 0.24 | 0.23 |
| avg_family_size | last_value | 0.24 | 0.23 |
| avg_household_expenditure | arima | 15041.51 | 13855.99 |
| avg_household_expenditure | drift | 15041.51 | 13855.99 |
| avg_household_expenditure | last_value | 19769.74 | 18268.72 |
| avg_household_income | arima | 14543.40 | 12499.76 |
| avg_household_income | drift | 11612.73 | 10475.13 |
| avg_household_income | last_value | 19328.36 | 16914.67 |

## Separate prediction preview

These predictions are not published to the application. The range is descriptive historical error, not a confidence interval.

| Year | Poverty prediction | Historical-error range |
|---|---:|---:|
| 2022 | 1.94% | 0.69–3.19% |
| 2023 | 1.94% | 0.69–3.19% |
| 2024 | 1.94% | 0.69–3.19% |

## Interpretation and data review

- This test did not change the active K-fold configuration or promote any model.
- Only observed FIES poverty targets are scored. Every fold interpolates from its past anchors only.
- ARIMA is the existing automatic specification search; past_selected compares ARIMA, last value and drift using earlier observed years.
- Candidate scores use nested chronological tuning; the current production K-fold score is not directly comparable.
- The winning candidate is selected on these few outer test points; its reported score is not an independent final holdout.
- The historical-error range uses the largest observed end-to-end error; it is descriptive, NOT a calibrated prediction interval.
- No actual one-year or two-year target coverage means accuracy at those horizons remains unknown.
- Survey definitions, threshold methodology, family weights and family-versus-population incidence require source-document verification.
- Threshold decreases occur in [2006]; verify source vintage/methodology rather than correcting automatically.

Protected live state unchanged during test: **True**.
