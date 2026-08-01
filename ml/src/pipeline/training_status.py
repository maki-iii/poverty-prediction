"""
In-memory training status tracker. Since training runs as a background
thread (not blocking the HTTP request), the frontend polls GET
/pipeline/train-status to see live progress instead of waiting for one
long request to finish.

Note: this is process-local memory, fine for a single uvicorn worker
(the default for local dev). If you ever deploy with multiple workers,
this would need to move to Redis/DB instead.
"""

import threading

_status = {
    "status": "idle",       # idle | running | completed | failed
    "step": None,            # e.g. "training", "evaluating", "predicting"
    "progress": 0,            # 0-100
    "message": "",
    "best_model": None,
    "error": None,
}
_lock = threading.Lock()


def reset():
    with _lock:
        _status.update({
            "status": "running",
            "step": "starting",
            "progress": 0,
            "message": "Starting training...",
            "best_model": None,
            "error": None,
        })


def update(step: str, progress: int, message: str):
    with _lock:
        _status.update({
            "status": "running",
            "step": step,
            "progress": progress,
            "message": message,
        })


def complete(best_model: str):
    with _lock:
        _status.update({
            "status": "completed",
            "step": "done",
            "progress": 100,
            "message": f"Training complete. Best model: {best_model}",
            "best_model": best_model,
        })


def fail(error: Exception):
    with _lock:
        _status.update({
            "status": "failed",
            "message": f"Failed: {error}",
            "error": str(error),
        })


def get_status() -> dict:
    with _lock:
        return dict(_status)


def is_running() -> bool:
    with _lock:
        return _status["status"] == "running"