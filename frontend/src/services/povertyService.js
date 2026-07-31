import * as PovertyApi from "../api/povertyApi";

// Business logic lives here -- which endpoint(s) to call, how to unwrap
// responses, any combining/transformation. Components/hooks call THIS,
// never api/povertyApi.js directly.

const PovertyService = {

  getActuals: async ({ region, startYear, endYear } = {}) => {
    const { data } = await PovertyApi.getActuals({ region, startYear, endYear });
    return data;
  },

  getLatestForecasts: async (region = "NCR") => {
    const { data } = await PovertyApi.getLatestForecasts(region);
    return data;
  },

  getLatestPredictions: async (region = "NCR") => {
    const { data } = await PovertyApi.getLatestPredictions(region);
    return data;
  },

  getModelComparison: async () => {
    const { data } = await PovertyApi.getModelComparison();
    return data;
  },

  getTimeline: async (region = "NCR") => {
    const { data } = await PovertyApi.getTimeline(region);
    return data;
  },

  // --- Pipeline triggers ---

  runForecast: async () => {
    const { data } = await PovertyApi.runForecast();
    return data;
  },

  runTrainAndEvaluate: async () => {
    const { data } = await PovertyApi.runTrainAndEvaluate();
    return data;
  },

  runPredict: async () => {
    const { data } = await PovertyApi.runPredict();
    return data;
  },

  runFullPipeline: async () => {
    const { data } = await PovertyApi.runFullPipeline();
    return data;
  },

};

export default PovertyService;