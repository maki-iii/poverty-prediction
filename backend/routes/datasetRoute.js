const express = require("express");
const multer = require("multer");
const path = require("path");
const DatasetController = require("../controllers/datasetController");
const verifyToken = require("../middlewares/authMiddleware");

const router = express.Router();

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

router.post("/upload", verifyToken, upload.single("file"), DatasetController.uploadDataset);
router.post("/:id/process", verifyToken, DatasetController.processDataset);
router.get("/:id/process-status", DatasetController.getProcessStatus);
router.get("/", verifyToken, DatasetController.listDatasets);
router.post("/:id/merge", verifyToken, DatasetController.mergeDataset);
router.delete("/:id", verifyToken, DatasetController.deleteDataset);

module.exports = router;