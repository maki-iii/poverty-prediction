import test from "node:test";
import assert from "node:assert/strict";
import axios from "axios";
import { mergeDatasetQueue } from "../src/services/datasetMergeQueue.js";
import { cancelOperations, getOperations, installOperationTracking } from "../src/services/operationTracker.js";

const datasets = [1997, 2000, 2003].map((year, index) => ({
  id: index + 1, original_filename: `${year}.csv`, region: "NCR", processed_year: year,
}));
const httpError = (status) => new Error("Merge rejected", { cause: { response: { status } } });

test("merges only selected IDs, sequentially, and keeps the batch guarded", async () => {
  const calls = [];
  const updates = [];
  let active = 0;
  const result = await mergeDatasetQueue([datasets[0], datasets[2]], async (id) => {
    assert.equal(++active, 1);
    assert.equal(getOperations().filter((operation) => operation.local).length, 1);
    calls.push(id);
    await Promise.resolve();
    active -= 1;
  }, (entries) => updates.push(entries));
  assert.deepEqual(calls, [1, 3]);
  assert.deepEqual(result.map((entry) => entry.status), ["merged", "merged"]);
  assert.equal(updates[0][0].status, "waiting");
  assert.equal(getOperations().length, 0);
});

test("duplicate region/year selections are rejected before any data is merged", async () => {
  await assert.rejects(mergeDatasetQueue([datasets[0], { ...datasets[0], id: 4 }],
    () => assert.fail("No merge expected")), /only one dataset for NCR \/ 1997/);
  assert.equal(getOperations().length, 0);
});

test("same year in different regions can merge", async () => {
  const result = await mergeDatasetQueue([datasets[0], { ...datasets[0], id: 4, region: "Region I" }], async () => {});
  assert.deepEqual(result.map((entry) => entry.status), ["merged", "merged"]);
});

test("a failed merge is reported while other selected datasets continue once each", async () => {
  const calls = [];
  const result = await mergeDatasetQueue(datasets, async (id) => {
    calls.push(id);
    if (id === 2) throw httpError(400);
  });
  assert.deepEqual(calls, [1, 2, 3]);
  assert.deepEqual(result.map((entry) => entry.status), ["merged", "failed", "merged"]);
  assert.equal(result[1].message, "Merge rejected");
  assert.equal(getOperations().length, 0);
});

test("uncertain connection or expired authorization stops remaining merges without retry", async () => {
  for (const error of [new Error("Network Error"), httpError(401), httpError(403)]) {
    let calls = 0;
    const result = await mergeDatasetQueue(datasets, async () => { calls += 1; throw error; });
    assert.equal(calls, 1);
    assert.equal(result[0].status, error.cause ? "failed" : "unconfirmed");
    assert.deepEqual(result.slice(1).map((entry) => entry.status), ["not merged", "not merged"]);
    assert.equal(getOperations().length, 0);
  }
});

test("leaving stops remaining merges even if the active merge completes before cancellation", async () => {
  let completeMerge;
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
    await new Promise((resolve) => { completeMerge = resolve; markStarted(); });
    return { config, data: { rows_merged: 1 }, status: 200 };
  } });
  installOperationTracking(client);
  const queued = mergeDatasetQueue(datasets, (id) => client.post(`/api/datasets/${id}/merge`));
  await started;
  const stopping = cancelOperations(client);
  completeMerge();
  const results = await queued;
  acknowledgeCancellation();
  await stopping;
  assert.deepEqual(results.map((entry) => entry.status), ["merged", "not merged", "not merged"]);
  assert.equal(requests.filter((url) => url.endsWith("/merge")).length, 1);
  assert.equal(requests.filter((url) => url.endsWith("/cancel")).length, 1);
  assert.equal(getOperations().length, 0);
});

test("empty selection makes no request", async () => {
  assert.deepEqual(await mergeDatasetQueue([], () => assert.fail("No merge expected")), []);
});
