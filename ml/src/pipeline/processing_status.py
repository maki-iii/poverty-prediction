"""
In-memory processing status tracker, keyed by dataset_id (unlike training,
which is a single global job, multiple datasets could theoretically be
processed independently, so each gets its own tracked status).
"""

import threading

_statuses = {}  # {dataset_id: {status, step, progress, message, error}}
_lock = threading.Lock()


def reset(dataset_id: int):
    with _lock:
        _statuses[dataset_id] = {
            "status": "running",
            "step": "reading_file",
            "progress": 0,
            "message": "Reading file...",
            "error": None,
        }


def update(dataset_id: int, step: str, progress: int, message: str):
    with _lock:
        if dataset_id not in _statuses:
            _statuses[dataset_id] = {}
        _statuses[dataset_id].update({
            "status": "running",
            "step": step,
            "progress": progress,
            "message": message,
        })


def complete(dataset_id: int):
    with _lock:
        _statuses[dataset_id] = {
            "status": "completed",
            "step": "done",
            "progress": 100,
            "message": "Processing complete.",
            "error": None,
        }


def fail(dataset_id: int, error: Exception):
    with _lock:
        _statuses[dataset_id] = {
            "status": "failed",
            "step": "error",
            "progress": 0,
            "message": f"Failed: {error}",
            "error": str(error),
        }


def get_status(dataset_id: int) -> dict:
    with _lock:
        return dict(_statuses.get(dataset_id, {"status": "idle", "step": None, "progress": 0, "message": ""}))


def is_running(dataset_id: int) -> bool:
    with _lock:
        return _statuses.get(dataset_id, {}).get("status") == "running"