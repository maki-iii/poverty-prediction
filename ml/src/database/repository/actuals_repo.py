"""
Repository for the `actuals` table.

This is the ONLY module allowed to write raw queries against `actuals`.
Everything else (seed script, ARIMA, ML training) calls these functions
instead of touching SQLAlchemy sessions directly.
"""

import pandas as pd

from src.database.base import get_session
from src.database.models.actuals import ActualIndicators


def insert_actuals(records: list[dict]) -> int:
    """
    Bulk insert actuals rows. Each dict must match ActualIndicators columns.
    Returns number of rows inserted.
    """
    session = get_session()
    try:
        objects = [ActualIndicators(**r) for r in records]
        session.add_all(objects)
        session.commit()
        return len(objects)
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def upsert_year(record: dict) -> str:
    """
    Insert a row for (region, year) if it doesn't exist, otherwise update it.
    Used later by the FIES-merge script when a new FIES release comes in.

    Returns "inserted" or "updated".
    """
    session = get_session()
    try:
        existing = (
            session.query(ActualIndicators)
            .filter_by(region=record["region"], year=record["year"])
            .first()
        )
        if existing:
            for key, value in record.items():
                setattr(existing, key, value)
            session.commit()
            return "updated"
        else:
            session.add(ActualIndicators(**record))
            session.commit()
            return "inserted"
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_actuals(region: str = None, start_year: int = None, end_year: int = None) -> pd.DataFrame:
    """
    Fetch actuals as a pandas DataFrame, optionally filtered by region/year range.
    This is what preprocessing and ML training call to get training data.
    """
    session = get_session()
    try:
        query = session.query(ActualIndicators)
        if region:
            query = query.filter(ActualIndicators.region == region)
        if start_year:
            query = query.filter(ActualIndicators.year >= start_year)
        if end_year:
            query = query.filter(ActualIndicators.year <= end_year)
        query = query.order_by(ActualIndicators.year.asc())

        rows = query.all()
        data = [
            {c.name: getattr(row, c.name) for c in ActualIndicators.__table__.columns}
            for row in rows
        ]
        return pd.DataFrame(data)
    finally:
        session.close()


def get_years_present(region: str = None) -> list[int]:
    """Returns sorted list of years already in the actuals table (for dedup checks)."""
    session = get_session()
    try:
        query = session.query(ActualIndicators.year)
        if region:
            query = query.filter(ActualIndicators.region == region)
        years = [row[0] for row in query.distinct().all()]
        return sorted(years)
    finally:
        session.close()