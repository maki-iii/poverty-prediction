# Selected K-fold validation

K-fold was adopted as the default on 2026-10-19. This filename is retained for
existing links; the configuration is no longer a temporary trial.

`configs/config.yaml` currently selects `ml.validation_method: kfold`.
This uses five shuffled folds with seed 42 and nested tuning. Each eligible
actual/interpolated row is tested once using its existing indicator values.
Predicted poverty is never added to training. The baseline is the training-fold
target mean. These scores include interpolated targets and are not directly
comparable to chronological ARIMA-plus-ML forecasting scores.

Future indicator forecasting and poverty prediction still use exactly three years.

Chronological evaluation remains available for an explicitly requested comparison
by setting `ml.validation_method: time_series`. The selected default is K-fold.
After an intentional configuration change, rebuild and retrain:

```powershell
docker compose --env-file .env.docker up -d --build ml frontend
```

Changing the setting does not recompute existing metrics: use Train Models after
deployment. Neither switching modes nor rebuilding requires deleting any data.
