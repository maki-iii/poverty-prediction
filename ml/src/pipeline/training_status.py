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
from src.pipeline.operations import checkpoint, commit_step

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
    checkpoint()
    with _lock:
        _status.update({
            "status": "running",
            "step": step,
            "progress": progress,
            "message": message,
        })


@commit_step
def complete(best_model: str, results: dict = None, selection_metric: str = None,
             prediction_years: str = None, triggered_by: str = None):
    with _lock:
        _status.update({
            "status": "completed",
            "step": "done",
            "progress": 100,
            "message": f"Training complete. Best model: {best_model}",
            "best_model": best_model,
        })

    # Persist to training_runs history table
    from src.database.repository.training_runs_repo import create_run
    try:
        create_run(
            status="completed",
            best_model=best_model,
            selection_metric=selection_metric,
            results=results,
            prediction_years=prediction_years,
            triggered_by=triggered_by,
        )
    except Exception as e:
        print(f"[training_status] Warning: failed to save training run history: {e}")


def fail(error: Exception, triggered_by: str = None):
    with _lock:
        _status.update({
            "status": "failed",
            "message": f"Failed: {error}",
            "error": str(error),
        })

    from src.database.repository.training_runs_repo import create_run
    try:
        create_run(status="failed", error_message=str(error), triggered_by=triggered_by)
    except Exception as e:
        print(f"[training_status] Warning: failed to save training run history: {e}")


def get_status() -> dict:
    with _lock:
        return dict(_status)


def is_running() -> bool:
    with _lock:
        return _status["status"] == "running"

def cancel():
    with _lock:
        _status.update(status="cancelled", step="cancelled", message="Training cancelled. Previously saved data is unchanged.", error=None)
