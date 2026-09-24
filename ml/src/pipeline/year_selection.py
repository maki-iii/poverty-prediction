"""Resolve annual estimates without losing earlier batches or disguising estimates as actuals."""
import pandas as pd


def historical_rows(actuals):
    """Actual and interpolated history is eligible; generated predictions are not."""
    if actuals.empty or "source" not in actuals:
        return actuals.copy()
    return actuals.loc[actuals["source"].str.lower().isin(
        ["seed", "actual", "fies", "apis", "interpolated"]
    )].copy()


def observed_rows(actuals):
    if actuals.empty or "source" not in actuals:
        return actuals.copy()
    return actuals.loc[~actuals["source"].str.lower().isin(
        ["interpolated", "forecast", "predicted"]
    )].copy()


def latest_by_year(estimates, actuals, target=None):
    """Newest estimate per region/year, unless an actual/interpolated value supersedes it.

    For poverty, an APIS row with a missing target must not hide a prediction.
    Keep the original record/run id so retained estimates remain traceable.
    """
    if estimates.empty:
        return estimates.copy()
    order = [c for c in ("created_at", "id") if c in estimates]
    result = estimates.sort_values(order, kind="stable") if order else estimates.copy()
    keys = ["region", "year"]
    result = result.drop_duplicates(keys, keep="last")
    actuals = historical_rows(actuals)
    if target and not actuals.empty:
        actuals = actuals[actuals[target].notna()]
    if not actuals.empty:
        actual_keys = pd.MultiIndex.from_frame(actuals[keys])
        result = result.loc[~pd.MultiIndex.from_frame(result[keys]).isin(actual_keys)]
    return result.sort_values(keys).reset_index(drop=True)


FORECAST_HORIZON = 3


def latest_history_year(actuals):
    measured = historical_rows(actuals)
    if measured.empty:
        raise ValueError("At least one actual or interpolated year is required to anchor the three-year window.")
    return int(measured["year"].max())


def select_window(estimates, actuals, include_history=False):
    """Current three-year future window, optionally retaining historical gap estimates."""
    if estimates.empty or historical_rows(actuals).empty:
        return estimates.iloc[:0].copy()
    # Resolve each region independently when repository callers omit a region.
    parts = []
    for region, group in estimates.groupby("region"):
        history = actuals[actuals["region"] == region]
        if historical_rows(history).empty:
            continue
        anchor = latest_history_year(history)
        mask = group["year"] <= anchor + FORECAST_HORIZON
        if not include_history:
            mask &= group["year"] > anchor
        selected = group.loc[mask]
        if not include_history and set(selected["year"]) != set(range(anchor + 1, anchor + FORECAST_HORIZON + 1)):
            # After a deletion/merge, show no current results until the complete
            # new window exists, instead of presenting a misleading partial run.
            continue
        parts.append(selected)
    return pd.concat(parts, ignore_index=True) if parts else estimates.iloc[:0].copy()
