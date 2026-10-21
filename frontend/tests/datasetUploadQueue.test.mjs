import test from "node:test";
import assert from "node:assert/strict";
import axios from "axios";
import { uploadDatasetQueue } from "../src/services/datasetUploadQueue.js";
import { cancelOperations, getOperations, installOperationTracking } from "../src/services/operationTracker.js";

const files = [{ name: "1997.csv" }, { name: "2000.xlsx" }, { name: "2003.csv" }];
const httpError = (status) => new Error("Upload rejected", { cause: { response: { status } } });

test("uploads each file once, sequentially, with progress and a guard for the whole queue", async () => {
  const calls = [];
  const updates = [];
  let active = 0;
  const result = await uploadDatasetQueue(files, async (file, progress) => {
    assert.equal(++active, 1);
    assert.equal(getOperations().filter((operation) => operation.local).length, 1);
    calls.push(file.name);
    progress(50);
    await Promise.resolve();
    active -= 1;
  }, (entries) => updates.push(entries));
  assert.deepEqual(calls, files.map((file) => file.name));
  assert.deepEqual(result.map((entry) => entry.status), ["uploaded", "uploaded", "uploaded"]);
  assert.ok(updates.some((entries) => entries[0].progress === 50));
  assert.equal(updates[0][0].status, "waiting", "published snapshots must not be mutated later");
  assert.equal(getOperations().length, 0);
});

test("a rejected file does not prevent other files or retry already uploaded files", async () => {
  const calls = [];
  const result = await uploadDatasetQueue(files, async (file) => {
    calls.push(file.name);
    if (file === files[1]) throw httpError(400);
  });
  assert.deepEqual(calls, files.map((file) => file.name));
  assert.deepEqual(result.map((entry) => entry.status), ["uploaded", "failed", "uploaded"]);
  assert.equal(result[1].message, "Upload rejected");
  assert.equal(getOperations().length, 0);
});

test("network uncertainty or expired authorization stops the rest without retrying", async () => {
  for (const error of [new Error("Network Error"), httpError(401), httpError(403)]) {
    let calls = 0;
    const result = await uploadDatasetQueue(files, async () => { calls += 1; throw error; });
    assert.equal(calls, 1);
    assert.equal(result[0].status, error.cause ? "failed" : "unconfirmed");
    assert.deepEqual(result.slice(1).map((entry) => entry.status), ["not uploaded", "not uploaded"]);
    assert.equal(getOperations().length, 0);
  }
});

test("leaving stops the queue immediately while server cancellation is being acknowledged", async () => {
  let completeUpload;
  let acknowledgeCancellation;
  let markStarted;
  const started = new Promise((resolve) => { markStarted = resolve; });
  const requests = [];
  const client = axios.create({ adapter: async (config) => {
    requests.push(config.url);
    if (config.url.endsWith("/cancel")) {
      await new Promise((resolve) => { acknowledgeCancellation = resolve; });
      return { config, data: { status: "completed" }, status: 200 };
    }
    await new Promise((resolve) => { completeUpload = resolve; markStarted(); });
    return { config, data: { id: 1 }, status: 200 };
  } });
  installOperationTracking(client);
  const queued = uploadDatasetQueue(files, () => client.post("/api/datasets/upload"));
  await started;
  const stopping = cancelOperations(client);
  // First upload may finish successfully before the cancellation acknowledgement.
  completeUpload();
  const results = await queued;
  acknowledgeCancellation();
  await stopping;
  assert.deepEqual(results.map((entry) => entry.status), ["uploaded", "not uploaded", "not uploaded"]);
  assert.equal(requests.filter((url) => url === "/api/datasets/upload").length, 1);
  assert.equal(requests.filter((url) => url.endsWith("/cancel")).length, 1, "local queue has no server cancellation request");
  assert.equal(getOperations().length, 0);
});

test("empty selection starts no operation", async () => {
  assert.deepEqual(await uploadDatasetQueue([], () => assert.fail("No upload expected")), []);
  assert.equal(getOperations().length, 0);
});
