import sys
import json
from pathlib import Path

import pandas as pd

from config.settings import (
    MASTER_RAW_DATA_PATH,
    YEAR_COLUMN,
    REGION_COLUMN,
)


def load_master_data(path=MASTER_RAW_DATA_PATH):
    if path.exists():
        return pd.read_csv(path)

    return pd.DataFrame()


def load_selected_uploads(file_paths):
    dataframes = []

    for file_path in file_paths:
        path = Path(file_path)

        if not path.exists():
            raise FileNotFoundError(f"Uploaded dataset not found: {path}")

        df = pd.read_csv(path)
        dataframes.append(df)

    if not dataframes:
        raise ValueError("No selected uploaded files to merge.")

    return pd.concat(dataframes, ignore_index=True)


def remove_duplicates(df):
    duplicate_keys = []

    for col in ["household_id", REGION_COLUMN, YEAR_COLUMN]:
        if col in df.columns:
            duplicate_keys.append(col)

    if duplicate_keys:
        return df.drop_duplicates(
            subset=duplicate_keys,
            keep="last"
        )

    return df.drop_duplicates()


def sort_dataset(df):
    if YEAR_COLUMN in df.columns and REGION_COLUMN in df.columns:
        return df.sort_values(
            by=[YEAR_COLUMN, REGION_COLUMN]
        )

    return df


def merge_selected_uploads_to_master(file_paths):
    uploaded_df = load_selected_uploads(file_paths)
    master_df = load_master_data()

    if master_df.empty:
        merged_df = uploaded_df.copy()
    else:
        merged_df = pd.concat(
            [master_df, uploaded_df],
            ignore_index=True
        )

    merged_df = remove_duplicates(merged_df)
    merged_df = sort_dataset(merged_df)

    MASTER_RAW_DATA_PATH.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    merged_df.to_csv(MASTER_RAW_DATA_PATH, index=False)

    result = {
        "message": "Selected datasets merged into master dataset.",
        "master_path": str(MASTER_RAW_DATA_PATH),
        "rows": int(merged_df.shape[0]),
        "columns": int(merged_df.shape[1]),
    }

    print(json.dumps(result))

    return merged_df


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise ValueError(
            "Please provide selected upload file paths as JSON argument."
        )

    file_paths = json.loads(sys.argv[1])

    merge_selected_uploads_to_master(file_paths)