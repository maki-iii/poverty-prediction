"""
Repository for the `training_runs` table.
"""

import pandas as pd

from src.database.base import get_session
from src.database.models.training_runs import TrainingRun


def create_run(status: str, best_model: str = None, selection_metric: str = None,
               results: dict = None, prediction_years: str = None,
               error_message: str = None, triggered_by: str = None) -> int:
    """Creates a training run record. Returns its id."""
    session = get_session()
    try:
        run = TrainingRun(
            status=status,
            best_model=best_model,
            selection_metric=selection_metric,
            results=results,
            prediction_years=prediction_years,
            error_message=error_message,
            triggered_by=triggered_by,
            finished_at=pd.Timestamp.now(),
        )
        session.add(run)
        session.commit()
        session.refresh(run)
        return run.id
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def list_runs(limit: int = 50) -> pd.DataFrame:
    """Returns training run history, most recent first."""
    session = get_session()
    try:
        query = (
            session.query(TrainingRun)
            .order_by(TrainingRun.started_at.desc())
            .limit(limit)
        )
        rows = query.all()
        data = [
            {c.name: getattr(row, c.name) for c in TrainingRun.__table__.columns}
            for row in rows
        ]
        return pd.DataFrame(data)
    finally:
        session.close()


def get_run(run_id: int) -> dict:
    """Fetches a single training run by id."""
    session = get_session()
    try:
        record = session.query(TrainingRun).filter_by(id=run_id).first()
        if not record:
            return None
        return {c.name: getattr(record, c.name) for c in TrainingRun.__table__.columns}
    finally:
        session.close()