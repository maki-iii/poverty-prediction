"""
Repository for the `forecasts` table.

This is the ONLY module allowed to write raw queries against `forecasts`.
forecast_inputs.py calls these functions to persist ARIMA outputs.
"""

import pandas as pd
from src.pipeline.operations import commit_step

from src.database.base import get_session
from src.database.models.forecasts import ForecastedIndicators


@commit_step
def insert_forecasts(records: list[dict]) -> int:
    """
    Bulk insert forecast rows. Each dict must match ForecastedIndicators columns.
    Returns number of rows inserted.
    """
    session = get_session()
    try:
        objects = [ForecastedIndicators(**r) for r in records]
        session.add_all(objects)
        session.commit()
        return len(objects)
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_forecasts(region: str = None, model_run_id: str = None) -> pd.DataFrame:
    """
    Fetch forecast rows as a DataFrame, optionally filtered by region
    and/or model_run_id (the batch identifier from a single forecast run).
    """
    session = get_session()
    try:
        query = session.query(ForecastedIndicators)
        if region:
            query = query.filter(ForecastedIndicators.region == region)
        if model_run_id:
            query = query.filter(ForecastedIndicators.model_run_id == model_run_id)
        query = query.order_by(ForecastedIndicators.year.asc())

        rows = query.all()
        data = [
            {c.name: getattr(row, c.name) for c in ForecastedIndicators.__table__.columns}
            for row in rows
        ]
        return pd.DataFrame(data)
    finally:
        session.close()


def get_current_forecasts(region: str = None, include_history: bool = False) -> pd.DataFrame:
    from src.database.repository.actuals_repo import get_actuals
    from src.pipeline.year_selection import latest_by_year, select_window
    actuals = get_actuals(region=region)
    estimates = latest_by_year(get_forecasts(region=region), actuals)
    return select_window(estimates, actuals, include_history=include_history)


def get_latest_run_id(region: str = None) -> str:
    """Returns the most recent model_run_id for this region, or None if no forecasts exist yet."""
    session = get_session()
    try:
        query = session.query(ForecastedIndicators.model_run_id)
        if region:
            query = query.filter(ForecastedIndicators.region == region)
        query = query.order_by(ForecastedIndicators.created_at.desc())
        result = query.first()
        return result[0] if result else None
    finally:
        session.close()