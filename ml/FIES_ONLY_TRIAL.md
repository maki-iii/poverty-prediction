# Reversible FIES-only experiment

This document describes the earlier experiment. The active workflow is now
[threshold-based FIES processing](THRESHOLD_FIES_PIPELINE.md). Its three-input
models cannot be restored by changing only `data_history`; the legacy code,
feature configuration and matching model artifacts would also be required.

Set `data_history: fies_only` in `configs/config.yaml` to use explicitly tagged
FIES observations only. Both ML and indicator forecasting rebuild annual gaps
between FIES years using linear interpolation. Existing interpolated rows are
excluded because some contain measured APIS indicators. All four inputs,
including inflation, and the poverty target are rebuilt for gap years. FIES
observations are preserved. There is no interpolation beyond the FIES endpoints.

This is a read-only history view: original actuals, uploads and APIS records are
not edited or deleted. Dataset management still displays the saved records;
the forecast timeline displays the active history view. Forecasting continues
to produce exactly three years after the latest eligible FIES year. K-fold
settings are unchanged to isolate the data-source experiment.

## Switch back

Set `data_history: combined`, rebuild Docker, and train again:

```powershell
docker compose --env-file .env.docker up -d --build ml backend frontend
```

The pre-test Docker models/report are backed up under
`docker-state/saved-models/backups/before-fies-only-20261010-122734`.
They can also be restored without retraining; regenerate predictions using the
restored model so the current display matches. Keep historical run records.

Higher K-fold scores do not establish improved future-year forecasting skill.
Interpolated targets remain estimates, not additional measured observations.
