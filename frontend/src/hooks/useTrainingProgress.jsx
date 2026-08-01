import { useState, useRef, useCallback } from "react";
import PovertyService from "../services/povertyService";

// Polls /pipeline/train-status every `intervalMs` while training is active.
// Call start() to kick off training + begin polling; stops automatically
// once status is "completed" or "failed".
export default function useTrainingProgress(intervalMs = 1500) {
  const [status, setStatus] = useState(null); // { status, step, progress, message, best_model, error }
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState(null);
  const pollRef = useRef(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const poll = useCallback(() => {
    pollRef.current = setInterval(async () => {
      try {
        const data = await PovertyService.getTrainStatus();
        setStatus(data);
        if (data.status === "completed" || data.status === "failed") {
          stopPolling();
        }
      } catch (err) {
        setStatus({ status: "failed", message: err.message, progress: 0 });
        stopPolling();
      }
    }, intervalMs);
  }, [intervalMs, stopPolling]);

  const start = useCallback(
    async (triggerFn) => {
      setStarting(true);
      setStartError(null);
      try {
        await triggerFn(); // e.g. PovertyService.runTrainAndEvaluate
        setStatus({ status: "running", step: "starting", progress: 0, message: "Starting..." });
        poll();
      } catch (err) {
        setStartError(err.message);
      } finally {
        setStarting(false);
      }
    },
    [poll]
  );

  const isRunning = status?.status === "running";

  return { status, starting, startError, start, isRunning };
}