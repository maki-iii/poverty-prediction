"""
Creates the MySQL database (if it doesn't exist) and all tables
defined in src/database/models/*.

Run this FIRST, before seed_from_excel.py.

Usage (from the ml/ folder):
    python -m src.database.init_db
"""

import pymysql

from src.database.base import Base, engine, DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME


def create_database_if_not_exists():
    """Connects without selecting a DB, creates it if missing."""
    conn = pymysql.connect(
        host=DB_HOST,
        port=int(DB_PORT),
        user=DB_USER,
        password=DB_PASSWORD,
        charset="utf8mb4",
    )
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}` "
                f"CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
        conn.commit()
        print(f"[init_db] Database '{DB_NAME}' ready.")
    finally:
        conn.close()


def create_tables():
    """Creates all tables registered on Base (actuals, forecasts, predictions)."""
    # Import models so they register themselves on Base.metadata
    from src.database.models import actuals, forecasts, predictions, uploaded_datasets  # noqa: F401

    Base.metadata.create_all(engine)
    print("[init_db] Tables created: actuals, forecasts, predictions")


if __name__ == "__main__":
    create_database_if_not_exists()
    create_tables()
    print("[init_db] Done.")