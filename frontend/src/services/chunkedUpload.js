import { finishOperation, startLocalOperation } from "./operationTracker.js";

export async function chunkedUpload(client, file, onProgress) {
  const operation = startLocalOperation("Dataset upload");
  const signal = operation.controller.signal;
  let id;
  let completing = false;
  try {
    const { data } = await client.post("/api/datasets/uploads", { name: file.name, size: file.size }, { signal });
    id = data.id;
    const chunkSize = data.chunkSize;
    if (!Number.isInteger(chunkSize) || chunkSize <= 0 || chunkSize > 1024 * 1024) throw new Error("Invalid upload chunk size from server.");
    for (let offset = 0; offset < file.size; offset += chunkSize) {
      signal.throwIfAborted();
      const chunk = file.slice(offset, offset + chunkSize);
      await client.post(`/api/datasets/uploads/${id}/chunks/${offset}`, chunk, {
        signal,
        timeout: 60000,
        headers: { "Content-Type": "application/octet-stream" },
        onUploadProgress: (event) => onProgress?.(Math.min(99, Math.floor((offset + event.loaded) / file.size * 100))),
      });
    }
    signal.throwIfAborted();
    completing = true;
    const result = await client.post(`/api/datasets/uploads/${id}/complete`, null, { timeout: 60000 });
    onProgress?.(100);
    return result;
  } finally {
    // Partial transfer has not created a dataset. Never delete a session whose
    // completion might still be saving a dataset after a lost response.
    if (id && !completing) await client.delete(`/api/datasets/uploads/${id}`, { timeout: 10000 }).catch(() => {});
    finishOperation(operation.id);
  }
}
