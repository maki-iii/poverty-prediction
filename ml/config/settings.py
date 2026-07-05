from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# PATHS
UPLOADS_DIR = BASE_DIR / "data" / "uploads"

MASTER_RAW_DATA_PATH = BASE_DIR / "data" / "raw" / "master_poverty_raw.csv"

PROCESSED_DATA_PATH = BASE_DIR / "data" / "processed" / "regional_poverty_processed.csv"
FEATURE_DATA_PATH = BASE_DIR / "data" / "processed" / "regional_poverty_features.csv"

MODELS_DIR = BASE_DIR / "models"
OUTPUTS_DIR = BASE_DIR / "outputs"

METRICS_PATH = OUTPUTS_DIR / "metrics" / "model_metrics.csv"
BEST_MODEL_PATH = MODELS_DIR / "best_model.pkl"

REGRESSION_PREDICTION_PATH = OUTPUTS_DIR / "predictions" / "regression_prediction.csv"
ARIMA_FORECAST_PATH = OUTPUTS_DIR / "predictions" / "arima_forecast.csv"

# REQUIRED COLUMNS
YEAR_COLUMN = "year"
REGION_COLUMN = "region"

# REGIONAL POVERTY CONVERSION
POVERTY_STATUS_COLUMN = "is_poor"

# Final ML target after aggregation
TARGET_COLUMN = "poverty_incidence"

# DYNAMIC SETTINGS
LAG_YEARS = 2
PREDICTION_YEAR = None
ARIMA_FORECAST_YEARS = 3

# MODEL SETTINGS
MODEL_RANDOM_STATE = 42
TEST_SIZE = 0.2

# AUTO FEATURE DETECTION
EXCLUDED_COLUMNS = [
    YEAR_COLUMN,
    REGION_COLUMN,
    POVERTY_STATUS_COLUMN,
    TARGET_COLUMN,
]

AUTO_DETECT_FEATURES = True
MANUAL_NUMERIC_FEATURES = []
MANUAL_CATEGORICAL_FEATURES = []