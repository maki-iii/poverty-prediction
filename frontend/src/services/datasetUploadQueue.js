import { finishOperation, startLocalOperation } from "./operationTracker.js";

// Send one file at a time through the existing authenticated upload endpoint.
// A failed file never causes successful files to be uploaded again.
export async function uploadDatasetQueue(files, upload, onChange = () => {}) {
  const entries = Array.from(files, (file) => ({
    name: file.name, status: "waiting", progress: 0, message: "",
  }));
  if (!entries.length) return entries;
  const operation = startLocalOperation("Dataset upload");
  const signal = operation.controller.signal;
  const publish = () => onChange(entries.map((entry) => ({ ...entry })));
  try {
    publish();
    for (let index = 0; index < entries.length; index += 1) {
      if (signal.aborted) break;
      const entry = entries[index];
      entry.status = "uploading";
      publish();
      try {
        await upload(files[index], (progress) => {
          entry.progress = progress;
          publish();
        });
        entry.status = "uploaded";
        entry.progress = 100;
      } catch (error) {
        const status = (error.cause || error).response?.status;
        entry.status = signal.aborted ? "stopped" : status ? "failed" : "unconfirmed";
        entry.message = signal.aborted ? "Upload stopped."
          : status ? error.message
          : "Upload could not be confirmed. Check Pending Uploads before retrying.";
        // A lost connection may hide a successful server write. Do not retry
        // automatically or send more files until the user checks the results.
        if (signal.aborted || !status || status === 401 || status === 403) break;
      } finally {
        publish();
      }
    }
  } finally {
    for (const entry of entries) {
      if (entry.status === "waiting") entry.status = "not uploaded";
    }
    finishOperation(operation.id);
    publish();
  }
  return entries;
}
