"""
Repository for the `predictions` table.

This is the ONLY module allowed to write raw queries against `predictions`.
predict_poverty.py calls these functions to persist ML outputs.
"""

import pandas as pd
from src.pipeline.operations import commit_step

from src.database.base import get_session
from src.database.models.predictions import PovertyPrediction


@commit_step
def insert_predictions(records: list[dict]) -> int:
    """
    Bulk insert prediction rows. Each dict must match PovertyPrediction columns.
    Returns number of rows inserted.
    """
    session = get_session()
    try:
        objects = [PovertyPrediction(**r) for r in records]
        session.add_all(objects)
        session.commit()
        return len(objects)
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_current_predictions(region: str = None, include_history: bool = False) -> pd.DataFrame:
    from src.database.repository.actuals_repo import get_actuals
    from src.pipeline.year_selection import latest_by_year, select_window
    actuals = get_actuals(region=region)
    from src.pipeline.indicator_basis import current_basis_rows
    estimates = latest_by_year(current_basis_rows(get_predictions(region=region)), actuals, target="poverty_incidence")
    return select_window(estimates, actuals, include_history=include_history)


def get_predictions(region: str = None, model_run_id: str = None) -> pd.DataFrame:
    """
    Fetch prediction rows as a DataFrame, optionally filtered by region
    and/or model_run_id.
    """
    session = get_session()
    try:
        query = session.query(PovertyPrediction)
        if region:
            query = query.filter(PovertyPrediction.region == region)
        if model_run_id:
            query = query.filter(PovertyPrediction.model_run_id == model_run_id)
        query = query.order_by(PovertyPrediction.year.asc())

        rows = query.all()
        data = [
            {c.name: getattr(row, c.name) for c in PovertyPrediction.__table__.columns}
            for row in rows
        ]
        return pd.DataFrame(data)
    finally:
        session.close()
