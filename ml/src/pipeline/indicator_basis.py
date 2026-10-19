"""Version the population and aggregation used by indicators and model artifacts."""
from pathlib import Path

INDICATOR_BASIS = "poor_families_weighted_mean_v1"
SAVED_MODELS_DIR = Path(__file__).resolve().parents[2] / "saved_models" / "ml" / INDICATOR_BASIS


def current_basis_rows(frame):
    if frame.empty or "indicator_basis" not in frame:
        return frame.iloc[:0].copy()
    return frame.loc[frame["indicator_basis"].eq(INDICATOR_BASIS)].copy()
