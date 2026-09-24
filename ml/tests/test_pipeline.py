import unittest
from unittest.mock import patch, Mock
import numpy as np
import pandas as pd
from src.pipeline.year_selection import latest_by_year, latest_history_year, select_window
from src.preprocess import load_clean
from src.models.forecasting.forecast_inputs import annual_series, fit_and_forecast
from src.models.ml import train, predict_poverty
from src.metrics.metrics import compute_metrics


def rows(years, **extra):
    return pd.DataFrame([{"region": "NCR", "year": year, "id": index + 1,
        "created_at": "2026-01-01", **extra} for index, year in enumerate(years)])


class PipelineTests(unittest.TestCase):
    def test_upload_2026_preserves_2024_2025_and_new_horizon(self):
        old = rows([2024, 2025, 2026], model_run_id="old", value=10)
        new = rows([2027, 2028, 2029], model_run_id="new", value=20)
        actuals = rows([2023, 2026], source="FIES", poverty_incidence=2)
        result = latest_by_year(pd.concat([old, new]), actuals)
        self.assertEqual(result.year.tolist(), [2024, 2025, 2027, 2028, 2029])
        self.assertEqual(result.model_run_id.tolist()[:2], ["old", "old"])
        later_actuals = pd.concat([actuals, rows([2024], source="FIES")])
        self.assertEqual(latest_by_year(result, later_actuals).year.tolist(), [2025, 2027, 2028, 2029])

    def test_newest_record_per_year_and_region(self):
        old = rows([2024], value=1)
        new = rows([2024], value=2); new["id"] = 20
        other = rows([2024], value=3); other["region"] = "OTHER"
        result = latest_by_year(pd.concat([new, other, old]), pd.DataFrame())
        self.assertEqual(result.value.tolist(), [2, 3])

    def test_apis_does_not_hide_poverty_prediction(self):
        estimates = rows([2024, 2025])
        actuals = rows([2024], source="APIS", poverty_incidence=None)
        self.assertEqual(latest_by_year(estimates, actuals).year.tolist(), [2025])
        self.assertEqual(latest_by_year(estimates, actuals, "poverty_incidence").year.tolist(), [2024, 2025])

    def test_interpolated_rows_train_both_models(self):
        data = rows([2020, 2021], source="FIES", poverty_incidence=2,
            **{feature: 1 for feature in load_clean.FEATURE_COLUMNS})
        data.loc[1, "source"] = "interpolated"
        with patch.object(load_clean, "load_actuals", return_value=data), \
             patch.object(load_clean, "get_forecasts", return_value=pd.DataFrame()):
            X, y, years = load_clean.get_training_data()
            self.assertEqual(years.tolist(), [2020, 2021])
            self.assertEqual(load_clean.get_forecast_input_data()[1].tolist(), [2020, 2021])
        self.assertTrue(latest_by_year(rows([2021]), data).empty)

    def test_exact_requested_training_histories_before_and_after_release(self):
        features = {feature: 10 for feature in load_clean.FEATURE_COLUMNS}
        actuals = rows(range(1997, 2024), source="interpolated", poverty_incidence=2, **features)
        actuals.loc[actuals.year.isin([1997, 2000, 2003, 2006, 2009, 2012, 2015, 2018, 2021, 2023]), "source"] = "FIES"
        forecasts = rows([2024, 2025, 2026], **{f: 20 for f in features})
        with patch.object(load_clean, "load_actuals", return_value=actuals), \
             patch.object(load_clean, "get_forecasts", return_value=forecasts):
            history = load_clean.get_forecast_history()
            self.assertEqual(history.year.tolist(), list(range(1997, 2024)))
            self.assertNotIn("forecast", history.source.tolist())
            self.assertEqual(load_clean.get_training_data()[2].tolist(), list(range(1997, 2024)))
        new_actual = rows([2026], source="FIES", poverty_incidence=1.2, **{f: 99 for f in features})
        actuals = pd.concat([actuals, new_actual], ignore_index=True)
        with patch.object(load_clean, "load_actuals", return_value=actuals), \
             patch.object(load_clean, "get_forecasts", return_value=forecasts):
            history = load_clean.get_forecast_history().set_index("year")
            self.assertEqual(history.loc[2024, "avg_household_income"], 20)
            self.assertEqual(history.loc[2025, "avg_household_income"], 20)
            self.assertEqual(history.loc[2026, "avg_household_income"], 99)
            self.assertEqual(history.loc[2026, "source"], "FIES")
            X, y, years = load_clean.get_training_data()
            self.assertEqual(years.tolist(), list(range(1997, 2024)) + [2026])
            self.assertEqual(y.iloc[-1], 1.2)
            self.assertEqual(len(years), 28)

    def test_ml_never_reads_forecasts_or_accepts_predicted_targets(self):
        data = rows([2023, 2024, 2025, 2026], source="FIES", poverty_incidence=2,
            **{feature: 1 for feature in load_clean.FEATURE_COLUMNS})
        data.loc[1, "source"] = "interpolated"
        data.loc[2, "source"] = "forecast"
        data.loc[3, "source"] = "predicted"
        with patch.object(load_clean, "load_actuals", return_value=data), \
             patch.object(load_clean, "get_forecasts", side_effect=AssertionError("ML read forecasts")):
            X, y, years = load_clean.get_training_data()
        self.assertEqual(years.tolist(), [2023, 2024])

    def test_backtesting_never_loads_present_day_forecasts(self):
        data = rows([2021, 2022, 2023], source="interpolated",
            **{feature: 1 for feature in load_clean.FEATURE_COLUMNS})
        with patch.object(load_clean, "load_actuals", return_value=data), \
             patch.object(load_clean, "get_forecasts", side_effect=AssertionError("Backtest read forecasts")):
            X, years = load_clean.get_forecast_input_data(include_forecasts=False)
        self.assertEqual(years.tolist(), [2021, 2022, 2023])

    def test_initial_history_forecasts_2024_to_2026(self):
        from src.models.forecasting import forecast_inputs
        actuals = rows(range(1997, 2024), source="interpolated", poverty_incidence=2,
            **{feature: 10 for feature in load_clean.FEATURE_COLUMNS})
        with patch.object(load_clean, "load_actuals", return_value=actuals), \
             patch.object(load_clean, "get_forecasts", return_value=pd.DataFrame()), \
             patch.object(forecast_inputs, "fit_and_forecast", return_value=([11,12,13], "test")) as fit:
            result, run = forecast_inputs.forecast_all_indicators()
        self.assertEqual(result.year.tolist(), [2024, 2025, 2026])
        self.assertEqual(len(fit.call_args.args[0]), 27)

    def test_repeated_forecasts_never_extend_the_window(self):
        from src.models.forecasting import forecast_inputs
        actuals = rows(range(1997, 2024), source="interpolated", poverty_incidence=2,
            **{feature: 10 for feature in load_clean.FEATURE_COLUMNS})
        forecasts = rows([2024, 2025, 2026], **{f: 20 for f in load_clean.FEATURE_COLUMNS})
        with patch.object(load_clean, "load_actuals", return_value=actuals), \
             patch.object(load_clean, "get_forecasts", return_value=forecasts), \
             patch.object(forecast_inputs, "fit_and_forecast", return_value=([21,22,23], "test")) as fit:
            result, run = forecast_inputs.forecast_all_indicators()
        self.assertEqual(result.year.tolist(), [2024, 2025, 2026])
        for call in fit.call_args_list:
            self.assertEqual(call.args[0].index.tolist(), list(range(1997, 2024)))

    def test_validation_trains_on_interpolation_but_scores_measured_targets(self):
        years = pd.Series(range(1997, 2024))
        observed = years.isin([1997,2000,2003,2006,2009,2012,2015,2018,2021,2023])
        folds = train.validation_folds(years, observed_mask=observed)
        for training, test in folds:
            self.assertTrue(observed.iloc[test].all())
            self.assertTrue((~observed.iloc[training]).any())
            self.assertTrue(observed.iloc[training[-1]])
            self.assertLess(years.iloc[training].max(), years.iloc[test].min())
        self.assertEqual(years.iloc[folds[0][0]].tolist(), list(range(1997, 2010)))
        self.assertEqual([years.iloc[test].tolist() for _, test in folds], [[2012],[2015],[2018],[2021],[2023]])

    def test_full_pipeline_trains_before_forecasting(self):
        from src.pipeline import run_full_pipeline as pipeline
        order = []
        with patch.object(pipeline, "run_evaluate", side_effect=lambda: order.append("train")), \
             patch.object(pipeline, "run_forecast", side_effect=lambda: order.append("forecast")), \
             patch.object(pipeline, "run_predict", side_effect=lambda: order.append("predict")):
            pipeline.run_full_pipeline()
        self.assertEqual(order, ["train", "forecast", "predict"])

    def test_missing_calendar_years_remain_missing(self):
        annual = annual_series(pd.Series([10, 11, 12, 15], index=[2021, 2022, 2023, 2026]))
        self.assertEqual(len(annual), 6)
        self.assertTrue(annual.loc["2024":"2025"].isna().all())
        with patch("src.models.forecasting.forecast_inputs.AUTO_ORDER", False):
            values, _ = fit_and_forecast(annual, 3)
        self.assertEqual(len(values), 3)
        self.assertTrue(np.isfinite(values).all())

    def test_sparse_target_folds_include_latest_and_obey_horizon(self):
        years = pd.Series([1997,2000,2003,2006,2009,2012,2015,2018,2021,2023])
        folds = train.validation_folds(years)
        self.assertEqual([years.iloc[test].tolist() for _, test in folds], [[2012],[2015],[2018],[2021],[2023]])
        for tr, te in folds:
            self.assertLess(years.iloc[tr].max(), years.iloc[te].min())
            self.assertLessEqual(years.iloc[te].max() - years.iloc[tr].max(), 3)

    def test_backtest_indicator_fit_never_sees_future(self):
        years = pd.Series(range(2000, 2010))
        X = pd.DataFrame({"income": range(10)})
        seen = []
        def fake_forecast(series, steps):
            seen.append(series.index.max())
            return [series.iloc[-1]] * steps, "test"
        with patch.object(train, "fit_and_forecast", side_effect=fake_forecast):
            folds = train.prepare_validation(X, years, X, years)
        for cutoff, (tr, te, future) in zip(seen, folds):
            self.assertEqual(cutoff, years.iloc[tr].max())
            self.assertTrue((future.income == X.income.iloc[tr[-1]]).all())
            self.assertLess(cutoff, years.iloc[te].min())

    def test_predictions_keep_historical_gaps(self):
        features = {feature: 1 for feature in load_clean.FEATURE_COLUMNS}
        actuals = rows([2023, 2026], source="FIES", poverty_incidence=2, **features)
        forecasts = rows([2024, 2025, 2027, 2028, 2029], **features)
        existing = rows([2024, 2025], predicted_poverty_incidence=3)
        model = Mock(); model.predict.side_effect = lambda X: np.repeat(2.5, len(X))
        with patch.object(predict_poverty, "load_best_model", return_value=(model,"ridge")), \
             patch.object(predict_poverty, "get_actuals", return_value=actuals), \
             patch.object(predict_poverty, "load_latest_forecasts", return_value=forecasts), \
             patch.object(predict_poverty, "get_current_predictions", return_value=existing), \
             patch.object(predict_poverty, "insert_predictions") as insert:
            records = predict_poverty.predict()
        self.assertEqual([r["year"] for r in records], [2027, 2028, 2029])
        insert.assert_called_once_with(records)

    def test_latest_api_returns_mixed_batches(self):
        from src.api import main
        forecasts = rows([2024, 2025, 2027], model_run_id="retained")
        predictions = rows([2024, 2025, 2027], model_run_id="retained")
        with patch.object(main, "get_current_forecasts", return_value=forecasts), \
             patch.object(main, "get_current_predictions", return_value=predictions):
            self.assertEqual([r["year"] for r in main.list_latest_forecasts()], [2024, 2025, 2027])
            self.assertEqual([r["year"] for r in main.list_latest_predictions()], [2024, 2025, 2027])

    def test_no_targets_produces_clear_training_error(self):
        X = pd.DataFrame({"income": [1, 2, 3, 4]})
        years = pd.Series([2000, 2003, 2006, 2009])
        with self.assertRaisesRegex(ValueError, "Not enough observed"):
            train.prepare_validation(X, years, X, years)

    def test_prediction_rejects_incomplete_three_year_window(self):
        features = {f: 1 for f in load_clean.FEATURE_COLUMNS}
        actuals = rows([2022], source="interpolated", poverty_incidence=2, **features)
        forecasts = rows([2023, 2025], **features)
        with patch.object(predict_poverty, "load_best_model", return_value=(Mock(), "ridge")), \
             patch.object(predict_poverty, "get_actuals", return_value=actuals), \
             patch.object(predict_poverty, "load_latest_forecasts", return_value=forecasts), \
             patch.object(predict_poverty, "insert_predictions") as insert:
            with self.assertRaisesRegex(ValueError, "exactly"):
                predict_poverty.predict()
        insert.assert_not_called()

    def test_delete_latest_actual_uses_latest_interpolation_as_anchor(self):
        from src.models.forecasting import forecast_inputs
        features = {f: 10 for f in load_clean.FEATURE_COLUMNS}
        actuals = rows(range(1997, 2024), source="interpolated", poverty_incidence=2, **features)
        actuals.loc[actuals.year == 2023, "source"] = "FIES"
        stored = rows(range(2023, 2035), **features)
        actuals = actuals[actuals.year != 2023]
        self.assertEqual(latest_history_year(actuals), 2022)
        with patch.object(load_clean, "load_actuals", return_value=actuals), \
             patch.object(load_clean, "get_forecasts", return_value=stored), \
             patch.object(forecast_inputs, "fit_and_forecast", return_value=([11,12,13], "test")):
            result, _ = forecast_inputs.forecast_all_indicators()
        self.assertEqual(result.year.tolist(), [2023, 2024, 2025])
        model = Mock(); model.predict.return_value = np.array([2, 2.1, 2.2])
        with patch.object(predict_poverty, "load_best_model", return_value=(model,"ridge")), \
             patch.object(predict_poverty, "get_actuals", return_value=actuals), \
             patch.object(predict_poverty, "load_latest_forecasts", return_value=result), \
             patch.object(predict_poverty, "insert_predictions"):
            predicted = predict_poverty.predict()
        self.assertEqual([r["year"] for r in predicted], [2023, 2024, 2025])

    def test_current_window_excludes_runaway_and_retained_historical_years(self):
        history = rows([2023, 2026], source="FIES", poverty_incidence=2)
        estimates = rows(range(2024, 2035))
        selected = latest_by_year(estimates, history)
        self.assertEqual(select_window(selected, history).year.tolist(), [2027, 2028, 2029])
        self.assertEqual(select_window(selected, history, include_history=True).year.tolist(), [2024, 2025, 2027, 2028, 2029])
        self.assertTrue(select_window(rows([2027, 2029]), history).empty)

    def test_new_release_keeps_gap_inputs_but_forecasts_only_next_three(self):
        from src.models.forecasting import forecast_inputs
        features = {f: 10 for f in load_clean.FEATURE_COLUMNS}
        actuals = pd.concat([rows(range(1997,2024),source="interpolated", **features),
                             rows([2026],source="FIES", **features)])
        stored = rows(range(2024,2035), **{f: 20 for f in features})
        with patch.object(load_clean, "load_actuals", return_value=actuals), \
             patch.object(load_clean, "get_forecasts", return_value=stored), \
             patch.object(forecast_inputs, "fit_and_forecast", return_value=([21,22,23], "test")) as fit:
            result, _ = forecast_inputs.forecast_all_indicators()
        self.assertEqual(result.year.tolist(), [2027, 2028, 2029])
        series = fit.call_args.args[0]
        self.assertEqual(series.loc[2024], 20)
        self.assertEqual(series.loc[2025], 20)
        self.assertEqual(series.loc[2026], 10)
        self.assertEqual(series.index.max(), 2026)

    def test_negative_r2_is_not_hidden(self):
        self.assertLess(compute_metrics([1,2,3], [9,9,9])["r2"], 0)
        self.assertIsNone(compute_metrics([1], [2])["r2"])
        self.assertIsNone(compute_metrics([1,1], [2,2])["r2"])


if __name__ == "__main__":
    unittest.main()
