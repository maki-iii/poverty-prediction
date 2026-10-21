import { finishOperation, startLocalOperation } from "./operationTracker.js";

export function validateMergeSelection(datasets) {
  const years = new Set();
  for (const dataset of datasets) {
    const key = `${dataset.region}:${dataset.processed_year}`;
    if (years.has(key)) {
      throw new Error(`Select only one dataset for ${dataset.region} / ${dataset.processed_year} to avoid overwriting another selected dataset.`);
    }
    years.add(key);
  }
}

export async function mergeDatasetQueue(datasets, merge, onChange = () => {}) {
  validateMergeSelection(datasets);
  const entries = datasets.map((dataset) => ({
    id: dataset.id, name: dataset.original_filename,
    region: dataset.region, year: dataset.processed_year,
    status: "waiting", message: "",
  }));
  if (!entries.length) return entries;
  const operation = startLocalOperation("Dataset merging");
  const signal = operation.controller.signal;
  const publish = () => onChange(entries.map((entry) => ({ ...entry })));
  try {
    publish();
    for (const entry of entries) {
      if (signal.aborted) break;
      entry.status = "merging";
      publish();
      try {
        await merge(entry.id);
        entry.status = "merged";
      } catch (error) {
        const status = (error.cause || error).response?.status;
        entry.status = signal.aborted ? "stopped" : status ? "failed" : "unconfirmed";
        entry.message = signal.aborted ? "Merge stopped. Previously completed merges were kept."
          : status ? error.message
          : "Merge could not be confirmed. Check your data before retrying.";
        if (signal.aborted || !status || status === 401 || status === 403) break;
      } finally {
        publish();
      }
    }
  } finally {
    for (const entry of entries) {
      if (entry.status === "waiting") entry.status = "not merged";
    }
    finishOperation(operation.id);
    publish();
  }
  return entries;
}
