const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { randomUUID } = require("node:crypto");

test("operation identities reach the ML service and cancellation is caller-scoped", async () => {
  const received = [];
  const server = http.createServer((req, res) => {
    received.push({ path: req.url, id: req.headers["x-operation-id"] });
    req.resume();
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ status: req.url.endsWith("/cancel") ? "cancelled" : "started" }));
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  process.env.ML_API_BASE_URL = `http://127.0.0.1:${server.address().port}`;
  const { trackOperation, cancelOperation } = require("../middlewares/operationMiddleware");
  const service = require("../services/povertyService");
  const id = randomUUID();
  const request = user => ({ user: { id: user }, get: () => id, params: { operationId: id } });
  try {
    await Promise.all([1, 2].map(user => new Promise((resolve, reject) => {
      trackOperation(request(user), {}, () => service.runTrainAndEvaluate().then(resolve, reject));
    })));
    assert.deepEqual(received.map(r => r.id).sort(), [`1:${id}`, `2:${id}`]);
    let response;
    await cancelOperation(request(1), { json: data => { response = data; } });
    assert.equal(response.status, "cancelled");
    assert.equal(decodeURIComponent(received.at(-1).path), `/operations/1:${id}/cancel`);
    let status;
    trackOperation({ user: { id: 1 }, get: () => "invalid" }, {
      status: value => { status = value; return { json() {} }; },
    }, () => assert.fail("invalid IDs must not reach the service"));
    assert.equal(status, 400);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
