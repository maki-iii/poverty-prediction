import axiosInstance from "../api/axiosInstance";

const BASE = "/api/poverty";

const PovertyService = {

  // --- Data retrieval ---

  getActuals: async ({ region, startYear, endYear } = {}) => {
    const { data } = await axiosInstance.get(`${BASE}/actuals`, {
      params: { region, startYear, endYear },
    });
    return data;
  },

  getLatestForecasts: async (region = "NCR") => {
    const { data } = await axiosInstance.get(`${BASE}/forecasts/latest`, {
      params: { region },
    });
    return data;
  },

  getLatestPredictions: async (region = "NCR") => {
    const { data } = await axiosInstance.get(`${BASE}/predictions/latest`, {
      params: { region },
    });
    return data;
  },

  getModelComparison: async () => {
    const { data } = await axiosInstance.get(`${BASE}/models/comparison`);
    return data;
  },

  getTimeline: async (region = "NCR") => {
    const { data } = await axiosInstance.get(`${BASE}/timeline`, {
      params: { region },
    });
    return data;
  },

  // --- Pipeline triggers ---

  runForecast: async () => {
    const { data } = await axiosInstance.post(`${BASE}/pipeline/forecast`);
    return data;
  },

  runTrainAndEvaluate: async () => {
    const { data } = await axiosInstance.post(`${BASE}/pipeline/train`);
    return data;
  },

  runPredict: async () => {
    const { data } = await axiosInstance.post(`${BASE}/pipeline/predict`);
    return data;
  },

  runFullPipeline: async () => {
    const { data } = await axiosInstance.post(`${BASE}/pipeline/run-full`);
    return data;
  },

  // --- Merge new actual data (file upload) ---

  mergeNewActuals: async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    const { data } = await axiosInstance.post(`${BASE}/actuals/merge`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

};

export default PovertyService;