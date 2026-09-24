"""Cancellation checks use isolated workers and mocks, never the live database."""
import threading
import asyncio
import json
import unittest
from unittest.mock import patch
from uuid import uuid4

from fastapi import HTTPException
from src.pipeline import operations


class CancellationTests(unittest.TestCase):
    def test_cancel_before_request_prevents_late_upload(self):
        identifier = str(uuid4())
        self.assertEqual(operations.cancel(identifier)["status"], "cancelled")
        called = []

        @operations.managed
        def upload(operation_id=None):
            called.append(True)

        with self.assertRaises(HTTPException) as error:
            upload(operation_id=identifier)
        self.assertEqual(error.exception.status_code, 409)
        self.assertEqual(called, [])

    def test_background_cancellation_survives_request_return_and_prevents_save(self):
        identifier = str(uuid4())
        ready, release, stopped = threading.Event(), threading.Event(), threading.Event()
        saved = []

        def worker():
            ready.set()
            release.wait(3)
            try:
                with operations.commit_section():
                    saved.append(True)
            except operations.OperationCancelled:
                stopped.set()

        @operations.managed
        def start(operation_id=None):
            operations.start_background(worker)

        start(operation_id=identifier)
        self.assertTrue(ready.wait(3))
        self.assertEqual(operations.cancel(identifier)["status"], "cancelling")
        release.set()
        self.assertTrue(stopped.wait(3))
        self.assertTrue(operations._get(identifier).done.wait(3))
        self.assertEqual(operations.cancel(identifier)["status"], "cancelled")
        self.assertEqual(saved, [])

    def test_completed_writes_are_preserved(self):
        identifier = str(uuid4())
        saved = ["existing data"]

        @operations.managed
        def merge(operation_id=None):
            with operations.commit_section():
                saved.append("new data")

        merge(operation_id=identifier)
        self.assertEqual(operations.cancel(identifier)["status"], "completed")
        self.assertEqual(saved, ["existing data", "new data"])

    def test_one_caller_cannot_cancel_another_callers_operation(self):
        identifier = str(uuid4())
        operations.cancel("user1:" + identifier)

        @operations.managed
        def work(operation_id=None):
            operations.checkpoint()
            return "finished"

        self.assertEqual(work(operation_id="user2:" + identifier), "finished")

    def test_training_cancel_does_not_run_forecasting_or_save_failure(self):
        from src.api import main
        from src.pipeline import training_status
        with patch.object(main, 'run_evaluate_pipeline', side_effect=operations.OperationCancelled), \
             patch.object(main, 'run_forecast_pipeline') as forecast, \
             patch.object(training_status, 'fail') as fail:
            main._run_training_background()
            self.assertEqual(training_status.get_status()['status'], 'cancelled')
            forecast.assert_not_called()
            fail.assert_not_called()

    def test_preprocessing_cancel_preserves_uploaded_record(self):
        from src.pipeline import dataset_management as datasets
        from src.pipeline import processing_status
        with patch.object(datasets, 'get_dataset', return_value={'status': 'pending', 'stored_path': 'data.csv'}), \
             patch.object(datasets.Path, 'exists', return_value=True), \
             patch.object(datasets, 'process_raw_survey', side_effect=operations.OperationCancelled), \
             patch.object(datasets, 'mark_processed') as save, \
             patch.object(datasets, 'mark_failed') as fail:
            datasets._process_dataset_background(999999, 'apis', 2023, 2.0)
            self.assertEqual(processing_status.get_status(999999)['status'], 'cancelled')
            save.assert_not_called()
            fail.assert_not_called()

    def test_api_rejects_cancelled_forecast_before_model_runs(self):
        from src.api.main import app
        identifier = str(uuid4())
        async def post(path, headers=()):
            messages = []
            async def receive():
                return {'type': 'http.request', 'body': b'', 'more_body': False}
            async def send(message):
                messages.append(message)
            await app({'type': 'http', 'asgi': {'version': '3.0'}, 'method': 'POST',
                       'path': path, 'raw_path': path.encode(), 'query_string': b'',
                       'headers': list(headers), 'scheme': 'http', 'http_version': '1.1',
                       'server': ('test', 80), 'client': ('test', 1234), 'root_path': ''}, receive, send)
            status = next(m['status'] for m in messages if m['type'] == 'http.response.start')
            body = b''.join(m.get('body', b'') for m in messages if m['type'] == 'http.response.body')
            return status, json.loads(body)
        with patch('src.api.main.run_forecast_pipeline') as forecast:
            status, result = asyncio.run(post(f'/operations/{identifier}/cancel'))
            self.assertEqual(result['status'], 'cancelled')
            status, result = asyncio.run(post('/pipeline/forecast', [(b'x-operation-id', identifier.encode())]))
            self.assertEqual(status, 409, result)
            forecast.assert_not_called()


if __name__ == '__main__':
    unittest.main()
