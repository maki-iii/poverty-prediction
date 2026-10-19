// Run: node --experimental-vm-modules --test tests/datasetRequest.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { SourceTextModule, SyntheticModule } from "node:vm";

test("processing carries the threshold through both frontend request layers", async () => {
  let request;
  const axios = new SyntheticModule(["default"], function () {
    this.setExport("default", { post: async (url, body) => {
      request = { url, body };
      return { data: { status: "processing" } };
    } });
  });
  const api = new SourceTextModule(await readFile(new URL("../src/api/datasetAPI.js", import.meta.url), "utf8"));
  await api.link(() => axios);
  const service = new SourceTextModule(await readFile(new URL("../src/services/datasetService.js", import.meta.url), "utf8"));
  await service.link(() => api);
  await service.evaluate();
  const input = { surveyType: "fies", year: 2023, povertyThreshold: 37711, povertyIncidence: 1.1 };
  const result = await service.namespace.default.processDataset(12, input);
  assert.deepEqual(request, { url: "/api/datasets/12/process", body: input });
  assert.deepEqual(result, { status: "processing" });
});
