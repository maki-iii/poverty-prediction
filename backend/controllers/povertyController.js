const PovertyService = require("../services/povertyService");

const PovertyController = {

  // GET /api/poverty/actuals
  getActuals: async (req, res) => {
    try {
      const { region, startYear, endYear } = req.query;
      const data = await PovertyService.getActuals({ region, startYear, endYear });
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },

  // DELETE /api/poverty/actuals/:year
  deleteActual: async (req, res) => {
    try {
      const { year } = req.params;
      const { region } = req.query;
      const result = await PovertyService.deleteActual(region || "NCR", year);
      return res.status(200).json(result);
    } catch (error) {
      const notFound = error.message.includes("No actuals row found");
      return res.status(notFound ? 404 : 500).json({ message: error.message });
    }
  },

  // GET /api/poverty/forecasts/latest
  getLatestForecasts: async (req, res) => {
    try {
      const { region } = req.query;
      const data = await PovertyService.getLatestForecasts(region);
      return res.status(200).json(data);
    } catch (error) {
      const notFound = error.message.includes("No forecasts found");
      return res.status(notFound ? 404 : 500).json({ message: error.message });
    }
  },

  // GET /api/poverty/predictions/latest
  getLatestPredictions: async (req, res) => {
    try {
      const { region } = req.query;
      const data = await PovertyService.getLatestPredictions(region);
      return res.status(200).json(data);
    } catch (error) {
      const notFound = error.message.includes("No predictions found");
      return res.status(notFound ? 404 : 500).json({ message: error.message });
    }
  },

  // GET /api/poverty/models/comparison
  getModelComparison: async (req, res) => {
    try {
      const data = await PovertyService.getModelComparison();
      return res.status(200).json(data);
    } catch (error) {
      const notFound = error.message.includes("No comparison results found");
      return res.status(notFound ? 404 : 500).json({ message: error.message });
    }
  },

  // GET /api/poverty/timeline
  getTimeline: async (req, res) => {
    try {
      const { region } = req.query;
      const data = await PovertyService.getTimeline(region);
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },

  // --- Pipeline triggers ---

  // POST /api/poverty/pipeline/forecast
  runForecast: async (req, res) => {
    try {
      const result = await PovertyService.runForecast();
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },

  // POST /api/poverty/pipeline/train
  runTrainAndEvaluate: async (req, res) => {
    try {
      const result = await PovertyService.runTrainAndEvaluate();
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },

  // POST /api/poverty/pipeline/predict
  runPredict: async (req, res) => {
    try {
      const result = await PovertyService.runPredict();
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },

  // POST /api/poverty/pipeline/run-full
  runFullPipeline: async (req, res) => {
    try {
      const result = await PovertyService.runFullPipeline();
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },

  // POST /api/poverty/actuals/merge  (multipart file upload)
  mergeNewActuals: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const result = await PovertyService.mergeNewActuals(req.file.buffer, req.file.originalname);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },

  // GET /api/poverty/pipeline/train-status
  getTrainStatus: async (req, res) => {
    try {
      const status = await PovertyService.getTrainStatus();
      return res.status(200).json(status);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },

  // GET /api/poverty/models/feature-importance
  getFeatureImportance: async (req, res) => {
    try {
      const data = await PovertyService.getFeatureImportance();
      return res.status(200).json(data);
    } catch (error) {
      const notFound = error.message.includes("No trained model found");
      return res.status(notFound ? 404 : 500).json({ message: error.message });
    }
  },

  // GET /api/poverty/training-runs
  getTrainingRuns: async (req, res) => {
    try {
      const { limit } = req.query;
      const data = await PovertyService.getTrainingRuns(limit);
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },

};

module.exports = PovertyController;