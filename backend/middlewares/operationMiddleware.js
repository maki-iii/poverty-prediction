const { AsyncLocalStorage } = require("node:async_hooks");
const axios = require("axios");
const config = require("../configs/mlApi.config");

const operationContext = new AsyncLocalStorage();
const validId = (id) => /^[0-9a-f-]{36}$/i.test(id || "");
const scopedId = (req, id) => `${req.user.id}:${id}`;

function trackOperation(req, res, next) {
  const id = req.get("X-Operation-Id");
  if (!id) return next(); // Existing API clients can still submit jobs.
  if (!validId(id) || req.user?.id == null) {
    return res.status(400).json({ message: "Invalid operation identity" });
  }
  operationContext.run(scopedId(req, id), next);
}

async function cancelOperation(req, res) {
  const id = req.params.operationId;
  if (!validId(id) || req.user?.id == null) {
    return res.status(400).json({ message: "Invalid operation identity" });
  }
  try {
    const { data } = await axios.post(
      `${config.baseURL}/operations/${encodeURIComponent(scopedId(req, id))}/cancel`,
      null,
      { timeout: config.timeout },
    );
    res.json(data);
  } catch (error) {
    res.status(502).json({ message: error.response?.data?.detail || "Could not confirm cancellation. Please try again." });
  }
}

module.exports = { operationContext, trackOperation, cancelOperation };
