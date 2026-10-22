const express = require("express");
const multer = require("multer");
const path = require("path");
const DatasetController = require("../controllers/datasetController");
const verifyToken = require("../middlewares/authMiddleware");

const { trackOperation, cancelOperation } = require("../middlewares/operationMiddleware");
const router = express.Router();
const { createChunkUploadRouter } = require("./chunkUploadRoute");
const DatasetService = require("../services/datasetService");
const AuditLogService = require("../services/auditLogService");
router.use("/uploads", createChunkUploadRouter({
  verifyToken,
  trackOperation,
  directory: path.join(__dirname, "..", "temp", "chunks"),
  save: async (filePath, name, user) => {
    const result = await DatasetService.uploadDataset(filePath, name, user.username);
    await AuditLogService.log({ userId: user.id, username: user.username, action: AuditLogService.ACTIONS.UPLOAD, details: `Uploaded dataset "${name}"` });
    return result;
  },
}));
router.post("/operations/:operationId/cancel", verifyToken, cancelOperation);

// Stream large files to a temp disk location instead of buffering the
// whole thing in memory -- avoids ENOBUFS when proxying big files to FastAPI.
const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, "..", "temp"),
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  }),
});

router.post("/upload", verifyToken, trackOperation, upload.single("file"), DatasetController.uploadDataset);
router.post("/:id/process", verifyToken, trackOperation, DatasetController.processDataset);
router.get("/:id/process-status", DatasetController.getProcessStatus);
router.get("/", verifyToken, DatasetController.listDatasets);
router.post("/:id/merge", verifyToken, trackOperation, DatasetController.mergeDataset);
router.delete("/:id", verifyToken, DatasetController.deleteDataset);

module.exports = router;
