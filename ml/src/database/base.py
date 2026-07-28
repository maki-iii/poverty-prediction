"""
Central DB connection setup.

This is the ONLY file that reads .env / builds the connection string.
Every other module (repositories, table models) imports `engine` or
`SessionLocal` from here instead of touching credentials directly.
"""

import os
from pathlib import Path

import yaml
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# ---------------------------------------------------------------------
# Load environment variables (.env at project root: ml/.env)
# ---------------------------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parents[2]  # ml/src/database/base.py -> ml/
load_dotenv(PROJECT_ROOT / ".env")

DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "poverty_prediction_db")

# ---------------------------------------------------------------------
# Load non-secret DB settings (driver, pool size, etc.)
# ---------------------------------------------------------------------
with open(PROJECT_ROOT / "configs" / "db_config.yaml", "r") as f:
    _db_cfg = yaml.safe_load(f)

DRIVER = _db_cfg.get("driver", "mysql+pymysql")
CHARSET = _db_cfg.get("charset", "utf8mb4")
POOL_SIZE = _db_cfg.get("pool_size", 5)
POOL_RECYCLE = _db_cfg.get("pool_recycle", 3600)
ECHO = _db_cfg.get("echo", False)

# ---------------------------------------------------------------------
# Build connection string and engine
# ---------------------------------------------------------------------
CONNECTION_STRING = (
    f"{DRIVER}://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    f"?charset={CHARSET}"
)

engine = create_engine(
    CONNECTION_STRING,
    pool_size=POOL_SIZE,
    pool_recycle=POOL_RECYCLE,
    echo=ECHO,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

Base = declarative_base()


def get_session():
    """Yield a DB session; caller is responsible for closing it.

    Usage:
        session = get_session()
        try:
            ... use session ...
        finally:
            session.close()
    """
    return SessionLocal()