"""Idempotent, additive migration; existing records and legacy columns are preserved."""
from sqlalchemy import inspect, text
from src.database.base import engine


def migrate():
    additions = {
        "actuals": {"poverty_threshold": "DECIMAL(12,2) NULL", "indicator_basis": "VARCHAR(50) NULL"},
        "uploaded_datasets": {"processed_poverty_threshold": "DECIMAL(12,2) NULL", "indicator_basis": "VARCHAR(50) NULL"},
        "forecasts": {"indicator_basis": "VARCHAR(50) NULL"},
        "predictions": {"indicator_basis": "VARCHAR(50) NULL"},
    }
    with engine.begin() as conn:
        for table, fields in additions.items():
            columns = {c["name"]: c for c in inspect(conn).get_columns(table)}
            for name, definition in fields.items():
                if name not in columns:
                    conn.execute(text(f"ALTER TABLE `{table}` ADD COLUMN `{name}` {definition}"))
            if table == "actuals" and not columns["inflation_rate"]["nullable"]:
                conn.execute(text("ALTER TABLE actuals MODIFY COLUMN inflation_rate DECIMAL(5,2) NULL"))


if __name__ == "__main__":
    migrate()
