import test from "node:test";
import assert from "node:assert/strict";
import axios from "axios";
import { describeOperation, getOperations, finishOperation, installOperationTracking, cancelOperations } from "../src/services/operationTracker.js";

test("all five operations are tracked, ordinary requests are not", () => {
  for (const url of ["/api/poverty/pipeline/train", "/api/poverty/pipeline/forecast", "/api/datasets/upload", "/api/datasets/1/process", "/api/datasets/1/merge"]) {
    assert.ok(describeOperation(url));
  }
  assert.equal(describeOperation("/api/datasets/1/process-status"), null);
});

test("background work remains guarded until its terminal status", async () => {
  const client = axios.create({ adapter: async (config) => ({ config, data: { status: config.method === "post" ? "started" : "completed" }, status: 200 }) });
  installOperationTracking(client);
  await client.post("/api/poverty/pipeline/train");
  assert.equal(getOperations().length, 1);
  await client.get("/api/poverty/pipeline/train-status");
  assert.equal(getOperations().length, 0);
});

test("cancellation failure retains the guard; acknowledgement clears it", async () => {
  let rejectCancellation = true;
  const client = axios.create({ adapter: async (config) => {
    if (config.url.endsWith("/cancel") && rejectCancellation) throw new Error("offline");
    return { config, data: { status: config.url.endsWith("/cancel") ? "cancelled" : "started" }, status: 200 };
  } });
  installOperationTracking(client);
  await client.post("/api/datasets/12/process");
  const operation = getOperations()[0];
  await assert.rejects(cancelOperations(client), /offline/);
  assert.equal(getOperations().length, 1);
  assert.equal(operation.controller.signal.aborted, false);
  rejectCancellation = false;
  await cancelOperations(client);
  assert.equal(getOperations().length, 0);
  assert.equal(operation.controller.signal.aborted, true);
});

test("a network timeout cannot silently clear active server work", async () => {
  const client = axios.create({ adapter: async (config) => { const error = new Error("timeout"); error.config = config; throw error; } });
  installOperationTracking(client);
  await assert.rejects(client.post("/api/poverty/pipeline/forecast"));
  assert.equal(getOperations().length, 1);
  finishOperation(getOperations()[0].id);
});
