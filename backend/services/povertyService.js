const axios = require("axios");
const { operationContext } = require("../middlewares/operationMiddleware");
const mlApiConfig = require("../configs/mlApi.config");

const mlApi = axios.create({
  baseURL: mlApiConfig.baseURL,
  timeout: mlApiConfig.timeout,
});

mlApi.interceptors.request.use((config) => {
  const id = operationContext.getStore();
  if (id) config.headers["X-Operation-Id"] = id;
  return config;
});

const PovertyService = {

  // Get historical actuals (1997-2023, or whatever's in the DB)
  getActuals: async ({ region, startYear, endYear } = {}) => {
    try {
      const { data } = await mlApi.get("/actuals", {
        params: { region, start_year: startYear, end_year: endYear },
      });
      return data;
    } catch (err) {
      throw new Error(`Failed to fetch actuals: ${err.message}`);
    }
  },

  // Delete Actual data
  deleteActual: async (region, year) => {
    try {
      const { data } = await mlApi.delete(`/actuals/${year}`, { params: { region } });
      return data;
    } catch (err) {
      if (err.response?.status === 404) {
        throw new Error(`No actuals row found for ${region} ${year}`);
      }
      throw new Error(`Failed to delete: ${err.response?.data?.detail || err.message}`);
    }
  },

  // Get latest ARIMA-forecasted inputs (e.g. 2024-2026)
  getLatestForecasts: async (region = "NCR") => {
    try {
      const { data } = await mlApi.get("/forecasts/latest", {
        params: { region },
      });
      return data;
    } catch (err) {
      if (err.response?.status === 404) {
        throw new Error("No forecasts found. Run the forecast pipeline first.");
      }
      throw new Error(`Failed to fetch forecasts: ${err.message}`);
    }
  },

  // Get latest predicted poverty incidence
  getLatestPredictions: async (region = "NCR") => {
    try {
      const { data } = await mlApi.get("/predictions/latest", {
        params: { region },
      });
      return data;
    } catch (err) {
      if (err.response?.status === 404) {
        throw new Error("No predictions found. Run the prediction pipeline first.");
      }
      throw new Error(`Failed to fetch predictions: ${err.message}`);
    }
  },

  // Get model comparison results (RMSE/MAE/R² for xgboost, ridge, random_forest)
  getModelComparison: async () => {
    try {
      const { data } = await mlApi.get("/models/comparison");
      return data;
    } catch (err) {
      if (err.response?.status === 404) {
        throw new Error("No comparison results found. Run the training pipeline first.");
      }
      throw new Error(`Failed to fetch model comparison: ${err.message}`);
    }
  },

  // Combined timeline: actuals + forecasts + predictions in one payload,
  // handy for a single chart showing historical -> forecasted -> predicted.
  getTimeline: async (region = "NCR") => {
    try {
      const [actuals, forecasts, predictions] = await Promise.all([
        mlApi.get("/actuals", { params: { region } }),
        mlApi.get("/forecasts/latest", { params: { region, include_history: true } }).catch(() => ({ data: [] })),
        mlApi.get("/predictions/latest", { params: { region, include_history: true } }).catch(() => ({ data: [] })),
      ]);

      return {
        actuals: actuals.data,
        forecasts: forecasts.data,
        predictions: predictions.data,
      };
    } catch (err) {
      throw new Error(`Failed to fetch timeline: ${err.message}`);
    }
  },

  // --- Pipeline triggers ---

  runForecast: async () => {
    try {
      const { data } = await mlApi.post("/pipeline/forecast");
      return data;
    } catch (err) {
      throw new Error(`Forecast step failed: ${err.response?.data?.detail || err.message}`);
    }
  },

  runTrainAndEvaluate: async () => {
    try {
      const { data } = await mlApi.post("/pipeline/train");
      return data;
    } catch (err) {
      throw new Error(`Training step failed: ${err.response?.data?.detail || err.message}`);
    }
  },

  runPredict: async () => {
    try {
      const { data } = await mlApi.post("/pipeline/predict");
      return data;
    } catch (err) {
      throw new Error(`Prediction step failed: ${err.response?.data?.detail || err.message}`);
    }
  },

  runFullPipeline: async () => {
    try {
      const { data } = await mlApi.post("/pipeline/run-full");
      return data;
    } catch (err) {
      throw new Error(`Pipeline run failed: ${err.response?.data?.detail || err.message}`);
    }
  },

  // Merge a new year of actual data (e.g. FIES 2026) -- expects a Buffer/file stream
  mergeNewActuals: async (fileBuffer, filename) => {
    try {
      const FormData = require("form-data");
      const form = new FormData();
      form.append("file", fileBuffer, filename);

      const { data } = await mlApi.post("/actuals/merge", form, {
        headers: form.getHeaders(),
      });
      return data;
    } catch (err) {
      throw new Error(`Merge failed: ${err.response?.data?.detail || err.message}`);
    }
  },

  getTrainStatus: async () => {
    try {
      const { data } = await mlApi.get("/pipeline/train-status");
      return data;
    } catch (err) {
      throw new Error(`Failed to fetch training status: ${err.response?.data?.detail || err.message}`);
    }
  },

  getFeatureImportance: async () => {
    try {
      const { data } = await mlApi.get("/models/feature-importance");
      return data;
    } catch (err) {
      if (err.response?.status === 404) {
        throw new Error("No trained model found. Train a model first.");
      }
      throw new Error(`Failed to fetch feature importance: ${err.response?.data?.detail || err.message}`);
    }
  },

  getTrainingRuns: async (limit = 50) => {
    try {
      const { data } = await mlApi.get("/training-runs", { params: { limit } });
      return data;
    } catch (err) {
      throw new Error(`Failed to fetch training history: ${err.response?.data?.detail || err.message}`);
    }
  },
  

};

module.exports = PovertyService;