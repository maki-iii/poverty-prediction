# Fixed three-year forecasting workflow

## Window

Every forecasting/training/prediction run uses exactly the three years after the
latest actual **or interpolated** year stored in actuals. Stored forecasts and
poverty predictions never advance this anchor.

- History ends in 2023: forecast/predict 2024, 2025, 2026.
- Run again without changing history: still 2024, 2025, 2026.
- Merge 2026 actuals: forecast/predict 2027, 2028, 2029.
- Delete 2023 so remaining history ends in interpolated 2022: regenerate
  2023, 2024, 2025. Re-run forecasting and Train after changing source data.

Prediction requires all three input years and refuses incomplete windows; it never
silently saves just two predictions. If current stored results do not cover all
three years after a history change, current-result endpoints return an empty list
until the window is regenerated. Reads do not modify data or fabricate missing values.

Old runs beyond the current horizon remain archived but are not shown as current
results or used to extend the forecast horizon. No database cleanup is required.

## Training histories

| Source | Indicator forecasting | Poverty-model training |
|---|---|---|
| Actual records | Yes | Yes, with a non-null poverty target |
| Interpolated records | Yes | Yes, with a non-null poverty target |
| Forecasted indicators in historical gaps, through the anchor | Yes | No |
| Forecasted indicators after the anchor | No | No |
| Predicted poverty | Never | Never |

Example after a 2026 release: ARIMA fits 1997-2023 actual/interpolated indicators,
retained 2024-2025 forecast indicators, and 2026 actual indicators. ML training
uses 1997-2023 actual/interpolated records plus the actual 2026 target. Existing
2024-2025 predicted poverty is retained in history but never enters ML training.

The full pipeline and app Train operation run: train/evaluate ML -> forecast the
three input years -> predict the same three poverty years. Uploads must be processed
and merged before they become actuals. Existing interpolation is used as stored.

## Results and charts

`GET /forecasts/latest` and `GET /predictions/latest` default to the complete current
three-year future window. `include_history=true` also includes retained missing-year
estimates before the anchor, for historical charts. Future rows beyond the current
window are always excluded. `/forecasts` and `/predictions` retain archival access.
The Node timeline service requests history, while current results tables request
only the three-year window.

Charts draw a continuous chronological path across actual, interpolated, and forecast
points. Segment colors distinguish the source; point labels and tooltips do not
relabel actual observations as forecasts merely to connect lines.

## Validation

ML final fitting includes actual + interpolated targets. Backtests train on eligible
history through measured anchor years and score held-out measured targets only.
Present-day forecast batches are excluded from historical backtests. Nested
chronological validation selects model settings. Negative R2 is retained; undefined
R2 is JSON null. Reports include actual/interpolated training counts and persistence
baseline errors. Interpolation does not create additional independent observations.

## Running

From `ml/`, with dependencies installed and MySQL running:

```sh
python -m unittest discover -s tests -v
python -m src.pipeline.run_full_pipeline
uvicorn src.api.main:app --reload --port 8000
```

Frontend chart-data checks: `node --test tests/timeline.test.js` from `frontend/`.
Restart the Python service after updates. No schema migration is needed.
