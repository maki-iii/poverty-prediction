// Track the lifetime of work, including jobs that outlive their POST request.
// A server-confirmed cancellation is required before removing a running job.
let snapshot = [];
const listeners = new Set();
const publish = () => listeners.forEach((listener) => listener());
export const subscribeOperations = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
export const getOperations = () => snapshot;

export function describeOperation(url = "") {
  if (url.endsWith("/pipeline/train")) return { label: "Model training", background: true, key: "training" };
  if (url.endsWith("/pipeline/forecast")) return { label: "Forecasting", key: "forecast" };
  if (url.endsWith("/datasets/upload")) return { label: "Dataset upload", key: "upload" };
  const match = url.match(/\/datasets\/(\d+)\/(process|merge)$/);
  if (match) return {
    label: match[2] === "process" ? "Preprocessing" : "Dataset merging",
    background: match[2] === "process",
    key: `${match[2]}:${match[1]}`,
  };
  return null;
}

export function finishOperation(id) {
  snapshot = snapshot.filter((operation) => operation.id !== id);
  publish();
}

// Keep navigation guarded between requests in a multi-file upload.
export function startLocalOperation(label) {
  const operation = { label, id: crypto.randomUUID(), controller: new AbortController(), local: true };
  snapshot = [...snapshot, operation];
  publish();
  return operation;
}

export function installOperationTracking(client) {
  client.interceptors.request.use((config) => {
    const description = config.method === "post" && describeOperation(config.url);
    if (!description) return config;
    const controller = new AbortController();
    const operation = { ...description, id: crypto.randomUUID(), controller };
    config.headers["X-Operation-Id"] = operation.id;
    config.signal = controller.signal;
    config.operationId = operation.id;
    snapshot = [...snapshot, operation];
    publish();
    return config;
  });
  client.interceptors.response.use((response) => {
    const operation = snapshot.find((item) => item.id === response.config.operationId);
    if (operation && (!operation.background || response.data.status !== "started")) {
      finishOperation(operation.id);
    }
    const url = response.config.url || "";
    const key = url.endsWith("/pipeline/train-status") ? "training"
      : url.match(/\/datasets\/(\d+)\/process-status$/)?.[1];
    if (key && ["completed", "failed", "cancelled"].includes(response.data.status)) {
      snapshot.filter((item) => item.key === (key === "training" ? key : `process:${key}`))
        .forEach((item) => finishOperation(item.id));
    }
    return response;
  }, (error) => {
    // A timeout/disconnection does not prove that the server stopped the job.
    // Keep the guard until explicit cancellation, unless the server rejected it.
    if (error.response && error.config?.operationId) finishOperation(error.config.operationId);
    return Promise.reject(error);
  });
}

export async function cancelOperations(client) {
  const operations = getOperations();
  // Stop queues before awaiting server acknowledgements, so no next file starts.
  for (const operation of operations.filter((item) => item.local)) {
    operation.controller.abort();
    finishOperation(operation.id);
  }
  const results = await Promise.allSettled(operations.filter((item) => !item.local).map(async (operation) => {
    const deadline = Date.now() + 45000;
    while (true) {
      const { data } = await client.post(`/api/poverty/operations/${operation.id}/cancel`);
      if (["cancelled", "completed"].includes(data.status)) {
        operation.controller.abort();
        finishOperation(operation.id);
        return;
      }
      if (Date.now() >= deadline) throw new Error("Cancellation is still in progress. Please try Yes again in a moment.");
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }));
  const failed = results.find((result) => result.status === "rejected");
  if (failed) throw failed.reason;
}
