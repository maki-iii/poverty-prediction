import { useState, useEffect, useCallback } from "react";
import DatasetService from "../services/datasetService";

// Fetches the list of uploaded datasets, with refetch support --
// call refetch() after upload/merge/delete to refresh the list.
export function useDatasets(status = null) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await DatasetService.listDatasets(status);
      setData(result);
    } catch (err) {
      setError(err.message || "Failed to load datasets");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Mutation-style hook for upload/merge/delete actions.
// Pages call these, then call refetch() from useDatasets() to refresh the list.
export function useDatasetActions() {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);

  const runAction = async (actionFn) => {
    setRunning(true);
    setError(null);
    try {
      const data = await actionFn();
      return data;
    } catch (err) {
      setError(err.message || "Action failed");
      throw err;
    } finally {
      setRunning(false);
    }
  };

  return {
    running,
    error,
    uploadDataset: (file, onProgress) => runAction(() => DatasetService.uploadDataset(file, onProgress)),
    mergeDataset: (datasetId) => runAction(() => DatasetService.mergeDataset(datasetId)),
    deleteDataset: (datasetId) => runAction(() => DatasetService.deleteDataset(datasetId)),
    processDataset: (datasetId, payload) => runAction(() => DatasetService.processDataset(datasetId, payload)),
  };
}