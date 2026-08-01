const express = require("express");
const multer = require("multer");
const PovertyController = require("../controllers/povertyController");

const router = express.Router();

// Store uploaded files in memory (as a Buffer) instead of writing to disk --
// we just forward the buffer straight to the FastAPI service.
const upload = multer({ storage: multer.memoryStorage() });

// --- Data retrieval ---
router.get("/actuals", PovertyController.getActuals);
router.get("/forecasts/latest", PovertyController.getLatestForecasts);
router.get("/predictions/latest", PovertyController.getLatestPredictions);
router.get("/models/comparison", PovertyController.getModelComparison);
router.get("/timeline", PovertyController.getTimeline);
router.delete("/actuals/:year", PovertyController.deleteActual);

// --- Pipeline triggers ---
router.post("/pipeline/forecast", PovertyController.runForecast);
router.post("/pipeline/train", PovertyController.runTrainAndEvaluate);
router.post("/pipeline/predict", PovertyController.runPredict);
router.post("/pipeline/run-full", PovertyController.runFullPipeline);
router.get("/pipeline/train-status", PovertyController.getTrainStatus);
// --- Merge new actual data (file upload) ---
router.post("/actuals/merge", upload.single("file"), PovertyController.mergeNewActuals);

module.exports = router;