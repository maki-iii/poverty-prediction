# Income-only evaluation — test only

Only weighted average family income is used by the test models. The live three-input setup is unchanged.

History: 9 survey years plus 16 interpolated years.
Actual survey years: 1997, 2000, 2003, 2006, 2009, 2012, 2015, 2018, 2021.

Scores below evaluate forecast indicators followed by ML against actual poverty observations.
Displayed numbers are truncated to two decimals; JSON retains full precision.

| Candidate | RMSE | MAE | R² | Actual targets |
|---|---:|---:|---:|---:|
| random_forest/arima | 0.66 | 0.50 | -0.52 | 4 |
| random_forest/past_selected | 0.66 | 0.50 | -0.52 | 4 |
| xgboost/arima | 0.81 | 0.64 | -1.28 | 4 |
| xgboost/past_selected | 0.81 | 0.64 | -1.28 | 4 |
| poverty_last_value | 0.81 | 0.65 | -1.33 | 4 |
| ridge/arima | 0.96 | 0.77 | -2.24 | 4 |
| poverty_drift | 0.97 | 0.94 | -2.33 | 4 |
| ridge/past_selected | 1.06 | 0.93 | -2.91 | 4 |

## Comparison with the archived three-input test

The input snapshot, model settings and historical target years match the archived test.

| Candidate | Three-input RMSE | Income-only RMSE | Three-input R² | Income-only R² |
|---|---:|---:|---:|---:|
| random_forest/arima | 0.65 | 0.66 | -0.49 | -0.52 |
| random_forest/past_selected | 0.65 | 0.66 | -0.49 | -0.52 |
| ridge/arima | 0.99 | 0.96 | -2.42 | -2.24 |
| ridge/past_selected | 0.99 | 1.06 | -2.44 | -2.91 |
| xgboost/arima | 0.79 | 0.81 | -1.17 | -1.28 |
| xgboost/past_selected | 0.81 | 0.81 | -1.28 | -1.28 |

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
| avg_household_income | arima | 14543.40 | 12499.76 |
| avg_household_income | drift | 11612.73 | 10475.13 |
| avg_household_income | last_value | 19328.36 | 16914.67 |

## Separate prediction preview

These predictions are not published to the application. The range is descriptive historical error, not a confidence interval.

| Year | Poverty prediction | Historical-error range |
|---|---:|---:|
| 2022 | 1.88% | 0.64–3.12% |
| 2023 | 1.88% | 0.64–3.12% |
| 2024 | 1.88% | 0.64–3.12% |

## Interpretation and data review

- This income-only test did not change the active three-input K-fold configuration or promote any model.
- The sole model input is weighted average family income below the poverty threshold; the population and aggregation have not changed.
- Only observed FIES poverty targets are scored. Every fold interpolates from its past anchors only.
- ARIMA is the existing automatic specification search; past_selected compares ARIMA, last value and drift using earlier observed years.
- Candidate scores use nested chronological tuning; the current production K-fold score is not directly comparable.
- The winning candidate is selected on these few outer test points; its reported score is not an independent final holdout.
- The historical-error range uses the largest observed end-to-end error; it is descriptive, NOT a calibrated prediction interval.
- Survey definitions, threshold methodology, family weights and family-versus-population incidence require source-document verification.
- Observed target horizons: [3] years ahead. Horizons without actual targets: [1, 2]; accuracy at those horizons remains unknown.
- Threshold decreases occur in [2006]; verify source vintage/methodology rather than correcting automatically.

Protected live state unchanged during test: **True**.
