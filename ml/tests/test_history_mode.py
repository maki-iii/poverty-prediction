import unittest
from unittest.mock import patch
import pandas as pd
from src.preprocess import history_mode, load_clean
from src.pipeline.year_selection import historical_rows, latest_history_year, select_window


def sample():
    rows = []
    for year, value, source in [(2000, 100, 'FIES'), (2001, 9999, 'APIS'),
                                 (2002, 8888, 'interpolated'), (2003, 160, 'FIES'),
                                 (2004, 7777, 'APIS')]:
        rows.append(dict(year=year, region='NCR', source=source, poverty_incidence=value / 100,
                         **{col: value for col in history_mode.CONFIG['feature_columns']}))
    return pd.DataFrame(rows)


class HistoryModeTests(unittest.TestCase):
    def setUp(self):
        self.enterContext(patch.dict(history_mode.CONFIG, data_history='fies_only', require_poverty_threshold=False))

    def test_gaps_rebuilt_without_mutating_stored_rows(self):
        original = sample()
        before = original.copy(deep=True)
        result = historical_rows(original)
        self.assertEqual(result.year.tolist(), [2000, 2001, 2002, 2003])
        self.assertEqual(result.avg_household_income.tolist(), [100, 120, 140, 160])
        self.assertEqual(result.source.tolist(), ['FIES', 'interpolated', 'interpolated', 'FIES'])
        self.assertAlmostEqual(result.poverty_incidence.iloc[1], 1.2)
        pd.testing.assert_frame_equal(original, before)
        pd.testing.assert_frame_equal(historical_rows(result), result)

    def test_new_2025_release_creates_2024_target_and_refreshes_on_correction(self):
        data = sample().query("source == 'FIES'").copy()
        data['year'] = [2023, 2025]
        data['poverty_incidence'] = [1.1, 2.4]
        with patch.object(load_clean, 'load_actuals', return_value=data):
            training = load_clean.get_training_frame()
        self.assertAlmostEqual(training.loc[training.year == 2024, 'poverty_incidence'].item(), 1.75)
        self.assertEqual(training.loc[training.year == 2024, 'source'].item(), 'interpolated')
        data.loc[data.year == 2025, 'poverty_incidence'] = 3.1
        self.assertAlmostEqual(historical_rows(data).query('year == 2024').poverty_incidence.item(), 2.1)
        from src.api.main import active_history
        with patch('src.api.main.get_actuals', return_value=data):
            response = active_history('NCR')
        row = next(r for r in response['rows'] if r['year'] == 2024)
        self.assertAlmostEqual(row['poverty_incidence'], 2.1)
        self.assertEqual(data.year.tolist(), [2023, 2025])

    def test_both_pipelines_use_same_fies_inputs_and_no_old_forecasts(self):
        with patch.object(load_clean, 'load_actuals', return_value=sample()), \
             patch.object(load_clean, 'get_forecasts', return_value=pd.DataFrame()):
            training = load_clean.get_training_frame()
            forecast = load_clean.get_forecast_history()
        pd.testing.assert_frame_equal(training[load_clean.FEATURE_COLUMNS], forecast[load_clean.FEATURE_COLUMNS])
        self.assertEqual(forecast.avg_household_income.iloc[1], 120)

    def test_horizon_ignores_later_apis_and_switch_restores_original(self):
        data = sample()
        self.assertEqual(latest_history_year(data), 2003)
        estimates = pd.DataFrame({'year': [2004, 2005, 2006, 2007], 'region': 'NCR'})
        self.assertEqual(select_window(estimates, data).year.tolist(), [2004, 2005, 2006])
        with patch.dict(history_mode.CONFIG, data_history='combined'):
            pd.testing.assert_frame_equal(historical_rows(data), data[data.source != 'APIS'])
            self.assertEqual(latest_history_year(data), 2003)

    def test_region_isolation_and_missing_fies(self):
        data = sample()
        other = data.copy(); other['region'] = 'OTHER'; other['avg_household_income'] *= 2
        result = historical_rows(pd.concat([data, other], ignore_index=True))
        self.assertEqual(result.query('region == "OTHER"').avg_household_income.tolist(), [200, 240, 280, 320])
        with self.assertRaisesRegex(ValueError, 'No FIES'):
            historical_rows(data[data.source != 'FIES'])
