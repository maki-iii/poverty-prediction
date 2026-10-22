const express = require("express");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

const CHUNK_SIZE = 1024 * 1024;
const MAX_SIZE = 512 * 1024 * 1024;

// Sessions belong to the authenticated user. Chunks are bytes, not parsed CSV rows.
function createChunkUploadRouter({ verifyToken, trackOperation, save, directory }) {
  const router = express.Router();
  const sessions = new Map();
  fs.mkdirSync(directory, { recursive: true });
  const removeFile = (session) => {
    try { fs.unlinkSync(session.path); } catch (error) { if (error.code !== "ENOENT") console.error("Upload cleanup failed", error.code); }
  };
  const timer = setInterval(() => {
    for (const [id, session] of sessions) {
      if (!session.busy && Date.now() - session.touched > 30 * 60 * 1000) {
        removeFile(session);
        sessions.delete(id);
      }
    }
  }, 60000);
  timer.unref();
  router.use(verifyToken);
  router.post("/", (req, res) => {
    const { name, size } = req.body || {};
    if (typeof name !== "string" || name.length > 255 || !/\.(csv|xlsx|xls)$/i.test(name) ||
        !Number.isSafeInteger(size) || size <= 0 || size > MAX_SIZE) {
      return res.status(400).json({ message: "Choose a non-empty CSV or Excel file up to 512 MB." });
    }
    if ([...sessions.values()].filter((s) => s.owner === req.user.id && !s.result && !s.error).length >= 4) {
      return res.status(429).json({ message: "Too many unfinished uploads. Wait for them to finish or expire." });
    }
    const id = randomUUID();
    const filePath = path.join(directory, id);
    fs.writeFileSync(filePath, Buffer.alloc(0), { flag: "wx" });
    sessions.set(id, { owner: req.user.id, name: path.basename(name), size, received: 0, path: filePath, touched: Date.now() });
    res.json({ id, chunkSize: CHUNK_SIZE });
  });
  router.use("/:id", (req, res, next) => {
    const session = sessions.get(req.params.id);
    if (!session || session.owner !== req.user.id) return res.status(404).json({ message: "Upload session not found. Start the upload again." });
    session.touched = Date.now();
    req.uploadSession = session;
    next();
  });
  router.post("/:id/chunks/:offset", express.raw({ type: "application/octet-stream", limit: CHUNK_SIZE }), (req, res) => {
    const session = req.uploadSession;
    const offset = Number(req.params.offset);
    const bytes = req.body;
    if (session.promise) return res.status(409).json({ message: "Upload is already being saved." });
    if (!Number.isSafeInteger(offset) || offset < 0 || !Buffer.isBuffer(bytes) || !bytes.length || offset + bytes.length > session.size) {
      return res.status(400).json({ message: "Invalid upload chunk." });
    }
    // A repeated chunk after a lost response is safe only if its bytes match.
    if (offset < session.received && offset + bytes.length <= session.received) {
      const existing = Buffer.alloc(bytes.length);
      const fd = fs.openSync(session.path, "r");
      try { fs.readSync(fd, existing, 0, bytes.length, offset); } finally { fs.closeSync(fd); }
      if (!existing.equals(bytes)) return res.status(409).json({ message: "Upload chunk does not match the saved bytes." });
    } else if (offset === session.received) {
      fs.appendFileSync(session.path, bytes);
      session.received += bytes.length;
    } else return res.status(409).json({ message: "Upload chunks arrived out of order." });
    res.json({ received: session.received });
  });
  router.post("/:id/complete", trackOperation, async (req, res) => {
    const session = req.uploadSession;
    if (session.received !== session.size) return res.status(409).json({ message: "File upload is incomplete." });
    // Never save twice if a proxy loses the completion response.
    if (!session.promise) {
      session.busy = true;
      session.promise = Promise.resolve().then(() => save(session.path, session.name, req.user))
        .then((result) => { session.result = result; return result; })
        .catch((error) => { session.error = error; throw error; })
        .finally(() => { session.busy = false; session.touched = Date.now(); removeFile(session); });
    }
    try { res.json(await session.promise); }
    catch (error) { res.status(500).json({ message: error.message }); }
  });
  router.delete("/:id", (req, res) => {
    if (req.uploadSession.busy) return res.status(409).json({ message: "File is being saved. Check Pending Uploads before retrying." });
    removeFile(req.uploadSession);
    sessions.delete(req.params.id);
    res.sendStatus(204);
  });
  router.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    res.status(error.status || 500).json({ message: error.type === "entity.too.large" ? "Upload chunk is too large." : "Could not receive the upload. Please try again." });
  });
  router.close = () => clearInterval(timer);
  return router;
}
module.exports = { createChunkUploadRouter, CHUNK_SIZE };
