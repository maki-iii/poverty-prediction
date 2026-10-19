# K-fold trial

`configs/config.yaml` currently selects `ml.validation_method: kfold`.
This uses five shuffled folds with seed 42 and nested tuning. Each eligible
actual/interpolated row is tested once using its existing indicator values.
Predicted poverty is never added to training. The baseline is the training-fold
target mean. These scores include interpolated targets and are not directly
comparable to chronological ARIMA-plus-ML forecasting scores.

Future indicator forecasting and poverty prediction still use exactly three years.

To restore the original evaluation, set `ml.validation_method: time_series`.
Then rebuild the Docker ML service and train again. Rebuild the frontend too when
deploying this trial for the first time so its evaluation labels are displayed:

```powershell
docker compose --env-file .env.docker up -d --build ml frontend
```

Changing the setting does not recompute existing metrics: use Train Models after
deployment. Neither switching modes nor rebuilding requires deleting any data.
