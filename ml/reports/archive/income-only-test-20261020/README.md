# Opt-in income-only evaluation

This replaces the earlier small-data experiment. Its source and results are
archived under `reports/archive/three-input-test-20261019` for comparison.
Only `avg_household_income` reaches the test models. Income still means the
survey-weighted average annual family income among families below the entered
poverty threshold. Expenditure and family size remain in the live setup and data.

This is a test only. The API does not call it. The selected FIES/K-fold workflow,
database records, saved models and UI remain unchanged.

From `ml`, run:

```text
python -m src.experiments.income_only_backtest --output reports/income-only-NEW-RUN --comparison reports/archive/three-input-test-20261019/results/results.json
```

The output directory must be new and outside production data/model/config paths.
The script verifies that data, settings and target windows match before comparing
the result with the archived three-input experiment. It reads one snapshot of the active threshold-processed FIES records and
saves that snapshot, a Markdown report, full-precision JSON and per-year results.
It never calls training/prediction persistence or model promotion functions.
Before/after hashes check for changes to production tables, model files and config.
Concurrent edits by a user will cause that check to report a change.

Each outer fold starts with at least five observed survey years and predicts the
next three calendar years. Only available actual FIES targets are scored; missing
target years are not replaced by interpolated evaluation targets. Every outer and
inner training history is interpolated afresh from anchors at or before its cutoff.

XGBoost, Ridge and Random Forest use the current parameter grids with nested
chronological tuning. Each is compared with the existing ARIMA income forecast
and with an income method selected using earlier observed-year errors. The latter
chooses among ARIMA, last value and drift for income. Direct
last-value and drift poverty forecasts provide simple baselines.

The best ML candidate produces a separate three-year preview, not a live model or
prediction update. The displayed historical-error range is the largest absolute
end-to-end backtest error around that preview. It is NOT a calibrated confidence
or prediction interval. Few observed targets cannot support a strong coverage claim.
The report also flags threshold decreases for source review; it cannot certify
survey definitions or official methodology from stored aggregates alone.

No test result is promoted automatically. A higher score than another candidate
does not establish reliable skill when only a few actual target years are available.
