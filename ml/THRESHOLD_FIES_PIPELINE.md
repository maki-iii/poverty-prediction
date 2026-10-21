# FIES indicators for families below the poverty threshold

This is the selected default workflow, adopted on 2026-10-19. It is used for
normal processing, merging, model training, forecasting and prediction; it is
not a temporary trial. The configuration uses FIES-only history, threshold-based
weighted means, three input indicators, and five shuffled K-fold splits with
nested tuning. There is no automatic switch back to the previous setup.

Process raw FIES microdata with the survey year, its NCR annual poverty threshold
in PHP **per person**, and the official poverty incidence percentage for that year.
Do not enter a monthly threshold or a threshold for a family of five without
converting it to annual per-person units first. Use a consistent official
methodology across historical years.

The processor multiplies the entered annual per-person poverty threshold by each
family's size to get its annual family income threshold. It selects NCR families
whose annual total family income is strictly below that family threshold. Income
equal to the family threshold is excluded. This is mathematically equivalent to
the earlier per-person income comparison. It then calculates survey
family-weighted means of total annual family income, total annual family
expenditure, and family size, using the same selected families for all three.
It requires valid family weights and rejects missing or invalid required values.
It rejects an empty selection instead of creating zero-valued indicators.

Historical FIES files can use `RFADJ` (adjusted raising factor) as the family
survey weight. It is recognized alongside the existing weight aliases, with
the same positive, finite weight validation. See the
[PSA 1991 FIES dictionary](https://psada.psa.gov.ph/catalog/45/datafile/F1).

These three means are the only ML and indicator-forecasting inputs. Inflation
and APIS observations are excluded. Poverty incidence remains the official
value entered by the user, not a value calculated from these means.

Historical gaps between eligible FIES years are linearly interpolated, including
the poverty target. The forecasting horizon remains three years after the latest
eligible historical year. Existing compatible forecasts may fill missing years
for indicator forecasting; predicted poverty incidence is never an ML target.
K-fold is the selected cross-validation method. The evaluation's methodological
limits remain documented below; adopting the workflow does not change what its
validation scores measure.

## Existing data and models

All original records, uploaded files and legacy model files are retained.
APIS records are hidden from active dataset lists. New records carry
`poor_families_weighted_mean_v1`; legacy whole-population averages are excluded
because they describe a different population. New models and evaluation reports
are stored in `saved_models/ml/poor_families_weighted_mean_v1`.

Upload and process the historical FIES files again with their year-specific
thresholds, then merge and retrain. Until then, the active history, forecasts and
predictions may be empty. The application does not invent historical thresholds
or relabel old averages as below-threshold averages.

Docker startup applies the additive database migration automatically. For a
non-Docker installation, run `python -m src.database.init_db` from `ml` before
starting the API. No migration deletes rows or legacy columns.

## Interpretation

A weighted mean avoids the direct effect that the number of sampled families
has on an unweighted sum. It is not a regional income total. Restricting the
population changes the meaning of the indicators and does not guarantee better
predictions. Evaluate future years against actual observations; interpolated
targets and shuffled K-fold scores are not proof of future forecasting accuracy.
