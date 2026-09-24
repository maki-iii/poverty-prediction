"""Cooperative cancellation for the single-worker local API.

Cancellation never deletes saved data. Short write sections finish together;
expensive calculations check for cancellation between fits/processing stages.
"""
from contextlib import contextmanager
from contextvars import ContextVar, copy_context
from functools import wraps
from threading import Event, RLock, Thread
from time import monotonic


class OperationCancelled(BaseException):
    """Like asyncio.CancelledError, must not be swallowed by model fallbacks."""


class Operation:
    def __init__(self):
        self.cancelled = Event()
        self.done = Event()
        self.lock = RLock()
        self.workers = 0
        self.started = False
        self.created = monotonic()


_operations = {}
_lock = RLock()
start_lock = RLock()
_current = ContextVar("operation", default=None)


def _get(operation_id):
    with _lock:
        # Keep cancellation tombstones for delayed requests, including uploads.
        expired = [key for key, op in _operations.items()
                   if op.done.is_set() and monotonic() - op.created > 86400]
        for key in expired:
            del _operations[key]
        return _operations.setdefault(operation_id, Operation())


def checkpoint():
    operation = _current.get()
    if operation and operation.cancelled.is_set():
        raise OperationCancelled("Operation cancelled by the user.")


@contextmanager
def commit_section():
    operation = _current.get()
    if operation is None:
        yield
        return
    with operation.lock:
        checkpoint()
        yield


def commit_step(function):
    @wraps(function)
    def wrapped(*args, **kwargs):
        with commit_section():
            return function(*args, **kwargs)
    return wrapped


def serialize_start(function):
    @wraps(function)
    def wrapped(*args, **kwargs):
        with start_lock:
            checkpoint()
            return function(*args, **kwargs)
    return wrapped


def _release(operation):
    with operation.lock:
        operation.workers -= 1
        if not operation.workers:
            operation.done.set()


def managed(function):
    """Wrap an API endpoint that accepts an optional operation_id header."""
    @wraps(function)
    def wrapped(*args, **kwargs):
        from fastapi import HTTPException
        operation_id = kwargs.get("operation_id")
        if not isinstance(operation_id, str):
            return function(*args, **kwargs)
        operation = _get(operation_id)
        with operation.lock:
            if operation.cancelled.is_set():
                raise HTTPException(409, "Operation cancelled by the user.")
            if operation.started:
                raise HTTPException(409, "Operation has already been submitted.")
            operation.started = True
            operation.workers += 1
        token = _current.set(operation)
        try:
            checkpoint()
            return function(*args, **kwargs)
        except OperationCancelled as error:
            raise HTTPException(409, str(error))
        finally:
            _current.reset(token)
            _release(operation)
    return wrapped


def start_background(target, args=()):
    """Carry cancellation ownership into the worker before the request returns."""
    operation = _current.get()
    context = copy_context()
    if operation:
        with operation.lock:
            operation.workers += 1

    def work():
        try:
            context.run(target, *args)
        finally:
            if operation:
                _release(operation)

    thread = Thread(target=work, daemon=True)
    try:
        thread.start()
    except BaseException:
        if operation:
            _release(operation)
        raise


def cancel(operation_id):
    operation = _get(operation_id)
    with operation.lock:
        if operation.done.is_set() and not operation.cancelled.is_set():
            return {"status": "completed"}
        operation.cancelled.set()
        if not operation.workers:
            operation.done.set()
    return {"status": "cancelled" if operation.done.is_set() else "cancelling"}
