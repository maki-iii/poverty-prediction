const express = require("express");
const multer = require("multer");
const PovertyController = require("../controllers/povertyController");
const verifyToken = require("../middlewares/authMiddleware");
const verifyyAdmin = require("../middlewares/adminMiddleware");

const { trackOperation, cancelOperation } = require("../middlewares/operationMiddleware");
const router = express.Router();
router.post("/operations/:operationId/cancel", verifyToken, cancelOperation);

const upload = multer({ storage: multer.memoryStorage() });

// --- Data retrieval (GET, unauthenticated) ---
router.get("/actuals", PovertyController.getActuals);
router.get("/forecasts/latest", PovertyController.getLatestForecasts);
router.get("/predictions/latest", PovertyController.getLatestPredictions);
router.get("/models/comparison", PovertyController.getModelComparison);
router.get("/models/feature-importance", PovertyController.getFeatureImportance);
router.get("/timeline", PovertyController.getTimeline);
router.get("/pipeline/train-status", PovertyController.getTrainStatus);
router.get("/training-runs", PovertyController.getTrainingRuns);

// --- Mutations (require auth for audit logging) ---
router.delete("/actuals/:year", verifyToken, verifyyAdmin, PovertyController.deleteActual);
router.post("/pipeline/forecast", verifyToken, verifyyAdmin, trackOperation, PovertyController.runForecast);
router.post("/pipeline/train", verifyToken, verifyyAdmin, trackOperation, PovertyController.runTrainAndEvaluate);
router.post("/pipeline/predict", verifyToken, verifyyAdmin, PovertyController.runPredict);
router.post("/pipeline/run-full", verifyToken, verifyyAdmin, PovertyController.runFullPipeline);
router.post("/actuals/merge", verifyToken, verifyyAdmin, upload.single("file"), PovertyController.mergeNewActuals);

module.exports = router;