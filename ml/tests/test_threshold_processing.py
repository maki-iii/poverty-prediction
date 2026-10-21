"""Threshold classification and pipeline isolation; no live database writes."""
import tempfile
import unittest
from decimal import Decimal
from pathlib import Path
from unittest.mock import patch

import pandas as pd
from pydantic import ValidationError
from src.api.schemas import ProcessDatasetRequest
from src.pipeline.raw_data_processor import process_raw_survey
from src.pipeline import dataset_management
from src.pipeline.indicator_basis import INDICATOR_BASIS, current_basis_rows, SAVED_MODELS_DIR
from src.preprocess import history_mode, load_clean
from src.pipeline.year_selection import historical_rows


class ThresholdProcessingTests(unittest.TestCase):
    def setUp(self):
        self.tmp = self.enterContext(tempfile.TemporaryDirectory())
        self.path = Path(self.tmp) / "fies.csv"
        # First family has total income ABOVE 10,000 but per-person income BELOW it.
        # Third is exactly at the threshold and must not qualify. Fifth is outside NCR.
        self.data = pd.DataFrame({"REGION": [13, 13, 13, 13, 1],
            "TOTIN": [20000, 5000, 20000, 100000, 1000],
            "TOTEX": [18000, 4000, 21000, 90000, 900],
            "FSIZE": [4, 1, 2, 2, 1], "RFACT": [2, 1, 100, 100, 999]})

    def process(self):
        self.data.to_csv(self.path, index=False)
        return process_raw_survey(self.path, "fies", 10000)

    def test_per_person_filter_and_common_weighted_population(self):
        result = self.process()
        self.assertEqual(result["row_count_used"], 2)
        self.assertAlmostEqual(result["avg_household_income"], 15000)
        self.assertAlmostEqual(result["avg_household_expenditure"], 40000 / 3)
        self.assertAlmostEqual(result["avg_family_size"], 3)
        self.assertEqual(result["poverty_threshold"], 10000)
        self.assertEqual(result["indicator_basis"], INDICATOR_BASIS)
        self.assertNotIn("poverty_incidence", result)
        self.assertNotIn("inflation_rate", result)

    def test_no_qualifying_families_is_not_a_fake_zero(self):
        self.data["TOTIN"] = 1000000
        with self.assertRaisesRegex(ValueError, "No NCR families"):
            self.process()

    def test_invalid_required_data_stops_processing(self):
        for column, value in [("FSIZE", 0), ("RFACT", -1), ("TOTIN", "bad"), ("TOTEX", float("inf"))]:
            with self.subTest(column=column):
                original = self.data.copy()
                self.data[column] = self.data[column].astype(object)
                self.data.loc[0, column] = value
                with self.assertRaisesRegex(ValueError, "invalid"):
                    self.process()
                self.data = original

    def test_weight_column_is_required_and_fies_aliases_supported(self):
        self.data = self.data.rename(columns={"RFACT": "FWGT", "TOTIN": "TOINC"})
        self.assertAlmostEqual(self.process()["avg_household_income"], 15000)
        self.data = self.data.drop(columns="FWGT")
        with self.assertRaisesRegex(ValueError, "survey weight"):
            self.process()

    def test_xlsx_supported(self):
        path = Path(self.tmp) / "fies.xlsx"
        self.data.to_excel(path, index=False)
        self.assertEqual(process_raw_survey(path, "fies", 10000)["row_count_used"], 2)

    def test_historical_rfadj_weights_in_csv_and_excel(self):
        self.data = self.data.rename(columns={"REGION": "REGN", "RFACT": "RFADJ"})
        for suffix in [".csv", ".xlsx"]:
            with self.subTest(suffix=suffix):
                path = Path(self.tmp) / f"fies1991{suffix}"
                if suffix == ".csv":
                    self.data.to_csv(path, index=False)
                else:
                    self.data.to_excel(path, index=False)
                result = process_raw_survey(path, "fies", 10000)
                self.assertEqual(result["region"], "NCR")
                self.assertEqual(result["row_count_used"], 2)
                # Unequal weights distinguish weighted means from plain means.
                self.assertAlmostEqual(result["avg_household_income"], 15000)
                self.assertAlmostEqual(result["avg_household_expenditure"], 40000 / 3)
                self.assertAlmostEqual(result["avg_family_size"], 3)

    def test_invalid_rfadj_weights_are_rejected(self):
        self.data = self.data.rename(columns={"RFACT": "RFADJ"})
        self.data["RFADJ"] = self.data["RFADJ"].astype(object)
        for value in [0, -1, "invalid", float("nan"), float("inf")]:
            with self.subTest(value=value):
                self.data.loc[0, "RFADJ"] = value
                with self.assertRaisesRegex(ValueError, "invalid.*survey weight"):
                    self.process()

    def test_existing_weight_alias_priority_is_preserved(self):
        self.data["RFADJ"] = 1
        self.assertAlmostEqual(self.process()["avg_household_income"], 15000)

    def test_fies_2000_total_expenditure_alias(self):
        self.data = self.data.rename(columns={"REGION": "REGN", "TOTIN": "TOINC", "TOTEX": "TOEXP"})
        # Other disbursements and expenditure categories are not the total.
        self.data["TOTDIS"] = 999999
        self.data["OTEXP"] = 999
        result = self.process()
        self.assertEqual(result["row_count_used"], 2)
        self.assertAlmostEqual(result["avg_household_income"], 15000)
        self.assertAlmostEqual(result["avg_household_expenditure"], 40000 / 3)

    def test_request_rejects_apis_missing_threshold_and_nonfinite_values(self):
        valid = dict(survey_type="fies", year=2023, poverty_threshold=37711, poverty_incidence=1.1)
        self.assertEqual(ProcessDatasetRequest(**valid).poverty_threshold, 37711)
        for change in [{"survey_type": "apis"}, {"poverty_threshold": 0}, {"poverty_threshold": float("nan")},
                       {"poverty_threshold": float("inf")}, {"poverty_incidence": None}, {"poverty_incidence": 101},
                       {"inflation_rate": 2}]:
            with self.subTest(change=change), self.assertRaises(ValidationError):
                ProcessDatasetRequest(**(valid | change))
        with self.assertRaises(ValidationError):
            ProcessDatasetRequest(year=2023, poverty_incidence=1.1)
        with self.assertRaisesRegex(ValueError, "Only FIES"):
            process_raw_survey(self.path, "apis", 37711)

    def test_old_averages_and_apis_cannot_enter_new_training_history(self):
        features = {f: 10 for f in load_clean.FEATURE_COLUMNS}
        rows = [dict(region="NCR", year=y, source=source, indicator_basis=basis,
                     poverty_incidence=target, poverty_threshold=10000, **features)
                for y, source, basis, target in [(2000, "FIES", None, 99),
                    (2023, "FIES", INDICATOR_BASIS, 1.1), (2024, "APIS", INDICATOR_BASIS, 99),
                    (2025, "FIES", INDICATOR_BASIS, 2.4)]]
        raw = pd.DataFrame(rows)
        before = raw.copy(deep=True)
        result = historical_rows(raw)
        self.assertEqual(result.year.tolist(), [2023, 2024, 2025])
        self.assertAlmostEqual(result.poverty_incidence.iloc[1], 1.75)
        pd.testing.assert_frame_equal(historical_rows(result), result)
        pd.testing.assert_frame_equal(raw, before)
        with patch.object(load_clean, "load_actuals", return_value=raw), \
             patch.object(load_clean, "get_forecasts", return_value=pd.DataFrame()):
            training = load_clean.get_training_frame()
            forecast = load_clean.get_forecast_history()
        pd.testing.assert_frame_equal(training[load_clean.FEATURE_COLUMNS], forecast[load_clean.FEATURE_COLUMNS])

    def test_empty_new_history_explains_reprocessing_and_retains_legacy(self):
        raw = pd.DataFrame([dict(region="NCR", year=2023, source="FIES", poverty_incidence=1,
                                 **{f: 10 for f in load_clean.FEATURE_COLUMNS})])
        self.assertTrue(historical_rows(raw).empty)
        with patch.object(load_clean, "load_actuals", return_value=raw):
            with self.assertRaisesRegex(ValueError, "poverty threshold"):
                load_clean.get_training_frame()
        self.assertEqual(len(raw), 1)
        self.assertTrue(current_basis_rows(raw).empty)
        self.assertEqual(SAVED_MODELS_DIR.name, INDICATOR_BASIS)
        self.assertEqual(load_clean.FEATURE_COLUMNS, ["avg_household_income", "avg_household_expenditure", "avg_family_size"])

    def test_history_api_accepts_database_decimal_thresholds(self):
        from src.api import main
        rows = [dict(region="NCR", year=year, source="FIES", indicator_basis=INDICATOR_BASIS,
                     poverty_threshold=Decimal(threshold), poverty_incidence=Decimal(target),
                     **{f: Decimal("10.25") for f in load_clean.FEATURE_COLUMNS})
                for year, threshold, target in [(1997, "13201.00", "4.50"), (1999, "15000.00", "3.50")]]
        for count in [1, 2]:
            with self.subTest(anchors=count):
                raw = pd.DataFrame(rows[:count])
                before = raw.copy(deep=True)
                with patch.object(main, "get_actuals", return_value=raw):
                    result = main.active_history("NCR")["rows"]
                self.assertEqual(result[0]["poverty_threshold"], 13201.0)
                self.assertEqual(result[0]["avg_household_income"], 10.25)
                if count == 2:
                    self.assertEqual([r["year"] for r in result], [1997, 1998, 1999])
                    self.assertIsNone(result[1]["poverty_threshold"])
                    self.assertEqual(result[1]["poverty_incidence"], 4.0)
                    self.assertEqual(result[2]["poverty_threshold"], 15000.0)
                pd.testing.assert_frame_equal(raw, before)

    def test_saved_forecasts_do_not_override_threshold_history_or_extend_anchor(self):
        features = {f: 10 for f in load_clean.FEATURE_COLUMNS}
        actuals = pd.DataFrame([
            dict(region="NCR", year=year, source="FIES", indicator_basis=INDICATOR_BASIS,
                 poverty_incidence=1, **features) for year in [2023, 2026]
        ])
        forecasts = pd.DataFrame([
            dict(region="NCR", year=year, indicator_basis=INDICATOR_BASIS,
                 **{f: 999 for f in features}) for year in [2024, 2025, 2027]
        ])
        with patch.object(load_clean, "load_actuals", return_value=actuals), \
             patch.object(load_clean, "get_forecasts", return_value=forecasts):
            history = load_clean.get_forecast_history()
        self.assertEqual(history.year.tolist(), [2023, 2024, 2025, 2026])
        self.assertTrue(history[load_clean.FEATURE_COLUMNS].eq(10).all().all())

    def test_old_processed_dataset_cannot_bypass_new_filter_on_merge(self):
        with patch.object(dataset_management, "get_dataset", return_value={"survey_type": "apis", "status": "processed"}), \
             patch.object(dataset_management, "upsert_year") as save:
            with self.assertRaisesRegex(ValueError, "poverty threshold"):
                dataset_management.merge_dataset(123)
            save.assert_not_called()

    def test_active_dataset_list_excludes_apis_and_serializes_missing_values(self):
        records = pd.DataFrame([
            {"id": 1, "survey_type": "apis", "processed_poverty_threshold": None},
            {"id": 2, "survey_type": "fies", "processed_poverty_threshold": 37711},
            {"id": 3, "survey_type": None, "processed_poverty_threshold": None},
        ])
        with patch.object(dataset_management, "list_datasets", return_value=records):
            result = dataset_management.get_datasets()
        self.assertEqual([row["id"] for row in result], [2, 3])
        self.assertIsNone(result[1]["processed_poverty_threshold"])
        self.assertEqual(len(records), 3)

    def test_processing_and_merge_preserve_threshold_and_official_target(self):
        self.data.to_csv(self.path, index=False)
        upload = {"status": "pending", "stored_path": str(self.path)}
        with patch.object(dataset_management, "get_dataset", return_value=upload), \
             patch.object(dataset_management, "mark_processed") as saved, \
             patch.object(dataset_management, "mark_failed") as failed:
            dataset_management._process_dataset_background(123, "fies", 2023, 10000, 1.1)
            failed.assert_not_called()
        values = saved.call_args.args[3]
        self.assertEqual(values["poverty_incidence"], 1.1)
        self.assertEqual(values["row_count_used"], 2)
        processed = {"status": "processed", "survey_type": "fies", "region": "NCR",
                     "original_filename": "fies.csv", "indicator_basis": INDICATOR_BASIS,
                     **{f"processed_{k}": v for k, v in values.items()}}
        with patch.object(dataset_management, "get_dataset", return_value=processed), \
             patch.object(dataset_management, "upsert_year", return_value="inserted") as save, \
             patch.object(dataset_management, "mark_merged"):
            dataset_management.merge_dataset(123)
        self.assertEqual(save.call_args.args[0]["poverty_threshold"], 10000)
        self.assertEqual(save.call_args.args[0]["poverty_incidence"], 1.1)


if __name__ == "__main__":
    unittest.main()
