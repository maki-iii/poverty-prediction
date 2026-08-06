const express = require("express");
const multer = require("multer");
const DatasetController = require("../controllers/datasetController");
const verifyToken = require("../middlewares/authMiddleware");
const verifyAdmin = require("../middlewares/adminMiddleware");

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

// All dataset routes require login -- req.user is populated by verifyToken,
// which datasetController.uploadDataset uses to record who uploaded a file.
router.post("/upload", verifyToken, verifyAdmin, upload.single("file"), DatasetController.uploadDataset);
router.get("/", verifyToken,verifyAdmin, DatasetController.listDatasets);
router.post("/:id/merge", verifyToken, verifyAdmin, DatasetController.mergeDataset);
router.delete("/:id", verifyToken, verifyAdmin, DatasetController.deleteDataset);
router.post("/:id/process", verifyToken, verifyAdmin, DatasetController.processDataset);
router.get("/:id/process-status", DatasetController.getProcessStatus);
module.exports = router;