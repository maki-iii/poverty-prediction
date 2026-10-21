"""Read-only history views. Never overwrite uploaded or stored observations."""
from pathlib import Path
import numpy as np
import pandas as pd
import yaml
from src.pipeline.indicator_basis import INDICATOR_BASIS, current_basis_rows

CONFIG = yaml.safe_load((Path(__file__).resolve().parents[2] / "configs/config.yaml").read_text())


def history_mode():
    mode = CONFIG.get("data_history", "combined")
    if mode not in ("combined", "fies_only"):
        raise ValueError(f"Unknown data_history: {mode}")
    return mode


def fies_history(actuals):
    """Rebuild every gap from explicitly tagged FIES anchors, per region.

    Stored interpolated rows can contain APIS indicators, so none are reused.
    All configured inputs and the target are interpolated by calendar year.
    Actual FIES values are preserved, including any missing target. No extrapolation.
    """
    columns = list(CONFIG["feature_columns"])
    if CONFIG["target_column"] in actuals:
        columns.append(CONFIG["target_column"])
    if "source" not in actuals:
        raise ValueError("FIES-only history requires explicit FIES source labels.")
    anchors = actuals.loc[actuals.source.str.lower().eq("fies")].copy()
    if CONFIG.get("require_poverty_threshold", False):
        anchors = current_basis_rows(anchors)
        if anchors.empty:
            return pd.DataFrame(columns=["region", "year", *columns, "source", "indicator_basis"])
    if anchors.empty:
        raise ValueError("No FIES observations are available for the FIES-only pipeline.")
    if anchors.duplicated(["region", "year"]).any():
        raise ValueError("Duplicate FIES region/year records.")
    parts = []
    for region, group in anchors.groupby("region"):
        group = group.sort_values("year").set_index("year")
        values = group[columns].astype(float)
        if not np.isfinite(values[CONFIG["feature_columns"]].to_numpy()).all():
            raise ValueError("FIES indicators must be finite before interpolation.")
        annual = values.reindex(range(int(group.index.min()), int(group.index.max()) + 1))
        annual = annual.interpolate(method="index", limit_area="inside")
        annual.loc[group.index, columns] = values
        annual["region"] = region
        annual["source"] = "interpolated"
        if CONFIG.get("require_poverty_threshold", False):
            annual["indicator_basis"] = INDICATOR_BASIS
            annual["poverty_threshold"] = np.nan
            if "poverty_threshold" in group:
                # SQL DECIMAL values arrive as Decimal objects. Match the numeric
                # history column's dtype without modifying the stored records.
                annual.loc[group.index, "poverty_threshold"] = group["poverty_threshold"].astype(float)
        annual.loc[group.index, "source"] = "FIES"
        annual.index.name = "year"
        parts.append(annual.reset_index())
    return pd.concat(parts, ignore_index=True)
