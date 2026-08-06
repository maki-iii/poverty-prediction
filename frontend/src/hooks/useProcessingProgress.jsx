import { useState, useRef, useCallback } from "react";
import DatasetService from "../services/datasetService";

// Polls /datasets/:id/process-status while processing is active.
// Call start(datasetId, payload) to kick off processing + begin polling.
export default function useProcessingProgress(intervalMs = 1200) {
  const [status, setStatus] = useState(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState(null);
  const pollRef = useRef(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const poll = useCallback(
    (datasetId) => {
      pollRef.current = setInterval(async () => {
        try {
          const data = await DatasetService.getProcessStatus(datasetId);
          setStatus(data);
          if (data.status === "completed" || data.status === "failed") {
            stopPolling();
          }
        } catch (err) {
          setStatus({ status: "failed", message: err.message, progress: 0 });
          stopPolling();
        }
      }, intervalMs);
    },
    [intervalMs, stopPolling]
  );

  const start = useCallback(
    async (datasetId, triggerFn) => {
      setStarting(true);
      setStartError(null);
      try {
        await triggerFn();
        setStatus({ status: "running", step: "reading_file", progress: 0, message: "Starting..." });
        poll(datasetId);
      } catch (err) {
        setStartError(err.message);
        throw err;
      } finally {
        setStarting(false);
      }
    },
    [poll]
  );

  const reset = useCallback(() => {
    stopPolling();
    setStatus(null);
    setStartError(null);
  }, [stopPolling]);

  const isRunning = status?.status === "running";

  return { status, starting, startError, start, isRunning, reset };
}