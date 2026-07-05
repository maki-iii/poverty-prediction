const express = require("express");
const router = express.Router();
const multer = require("multer");

const mlController = require("../controllers/mlController");
const verifyToken = require("../middlewares/authMiddleware");
const verifyAdmin = require("../middlewares/adminMiddleware");

router.use(verifyToken);

const upload = multer({
    dest: "temp/",
});

router.post(
    "/upload",
    verifyAdmin,
    upload.single("file"),
    mlController.upload
);

router.get("/datasets", mlController.datasets);

router.post(
    "/datasets/merge",
    verifyAdmin,
    mlController.mergeDatasets
);

router.post(
    "/datasets/:id/archive",
    verifyAdmin,
    mlController.archiveDataset
);

router.post("/preprocess", verifyAdmin, mlController.preprocess);
router.post("/train", verifyAdmin, mlController.train);
router.get("/regional-data", mlController.regionalData);
router.get("/training-status", mlController.trainingStatus);

router.get("/metrics", mlController.metrics);
router.get("/predictions", mlController.predictions);
router.get("/forecast", mlController.forecast);
router.get("/status", mlController.status);

module.exports = router;