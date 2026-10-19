import unittest
import json
import tempfile
from pathlib import Path
from unittest.mock import patch
import numpy as np
import pandas as pd
from src.models.ml import train, evaluate
from src.api.schemas import ModelComparisonOut


class KFoldTests(unittest.TestCase):
    def test_reproducible_disjoint_complete_splits_and_nested_isolation(self):
        X = pd.DataFrame({'x': np.arange(27)}, index=np.arange(100, 127))
        folds = train.prepare_kfold(X)
        again = train.prepare_kfold(X)
        self.assertEqual(len(folds), 5)
        self.assertEqual(sorted(np.concatenate([te for _, te, _ in folds]).tolist()), list(range(27)))
        for (tr, te, values), (tr2, te2, _) in zip(folds, again):
            self.assertFalse(set(tr) & set(te))
            np.testing.assert_array_equal(te, te2)
            pd.testing.assert_frame_equal(values, X.iloc[te])
            for inner_tr, inner_te, _ in train.prepare_kfold(X.iloc[tr]):
                self.assertFalse(set(tr[inner_tr]) & set(te))
                self.assertFalse(set(tr[inner_te]) & set(te))

    def test_switch_and_invalid_mode(self):
        with patch.dict(train.CONFIG['ml'], validation_method='time_series'):
            self.assertEqual(train.validation_method(), 'time_series')
        with patch.dict(train.CONFIG['ml'], validation_method='invalid'):
            with self.assertRaises(ValueError):
                train.validation_method()

    def test_small_input_rejected(self):
        with self.assertRaises(ValueError):
            train.prepare_kfold(pd.DataFrame({'x': [1, 2]}))

    def test_kfold_uses_training_mean_baseline(self):
        X = pd.DataFrame({'x': range(10)})
        y = pd.Series(np.arange(10, dtype=float))
        years = pd.Series(range(2000, 2010))
        class Model:
            def predict(self, inputs):
                return inputs['x'].to_numpy()
        with patch.object(train, 'fit_tuned_model', return_value=Model()):
            result = train.evaluate_model('ridge', X, y, years, train.prepare_kfold(X), method='kfold')
        self.assertEqual(result['rmse'], 0)
        self.assertEqual(result['test_points'], 10)
        self.assertIn('mean_baseline', result)
        self.assertNotIn('persistence_baseline', result)

    def test_report_labels_both_modes(self):
        for mode, baseline in [('kfold', 'mean_baseline'), ('time_series', 'persistence_baseline')]:
            with self.subTest(mode=mode), tempfile.TemporaryDirectory() as directory:
                with patch.dict(train.CONFIG['ml'], validation_method=mode), \
                     patch.object(evaluate, 'SAVED_MODELS_DIR', Path(directory)):
                    evaluate.save_comparison_report({'ridge': {'r2': 0.5, 'rmse': 1,
                        baseline: {'rmse': 2}}}, 'ridge')
                report = json.loads((Path(directory) / 'model_comparison_results.json').read_text())
                self.assertEqual(report['validation_mode'], mode)
                self.assertEqual(bool(report['evaluation_warning']), mode == 'kfold')
                response = ModelComparisonOut(**report).model_dump()
                self.assertEqual(response['evaluation_warning'], report['evaluation_warning'])
                self.assertEqual(response['validation_mode'], mode)
