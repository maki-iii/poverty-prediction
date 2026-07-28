import { useState, useEffect, useCallback } from "react";
import PovertyService from "../services/povertyService";

// Generic hook: wraps any PovertyService call with loading/error/data state,
// and gives back a `refetch` function so components can re-trigger it.
function useAsync(serviceFn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await serviceFn();
      setData(result);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// --- Specific hooks used by pages/components ---

export function useActuals({ region, startYear, endYear } = {}) {
  return useAsync(
    () => PovertyService.getActuals({ region, startYear, endYear }),
    [region, startYear, endYear]
  );
}

export function useLatestForecasts(region = "NCR") {
  return useAsync(() => PovertyService.getLatestForecasts(region), [region]);
}

export function useLatestPredictions(region = "NCR") {
  return useAsync(() => PovertyService.getLatestPredictions(region), [region]);
}

export function useModelComparison() {
  return useAsync(() => PovertyService.getModelComparison(), []);
}

export function useTimeline(region = "NCR") {
  return useAsync(() => PovertyService.getTimeline(region), [region]);
}

// --- Pipeline trigger hook (mutation-style, not auto-fetching) ---

export function usePipelineActions() {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const runAction = async (actionFn) => {
    setRunning(true);
    setError(null);
    try {
      const data = await actionFn();
      setResult(data);
      return data;
    } catch (err) {
      setError(err.message || "Pipeline action failed");
      throw err;
    } finally {
      setRunning(false);
    }
  };

  return {
    running,
    error,
    result,
    runForecast: () => runAction(PovertyService.runForecast),
    runTrainAndEvaluate: () => runAction(PovertyService.runTrainAndEvaluate),
    runPredict: () => runAction(PovertyService.runPredict),
    runFullPipeline: () => runAction(PovertyService.runFullPipeline),
    mergeNewActuals: (file) => runAction(() => PovertyService.mergeNewActuals(file)),
  };
}