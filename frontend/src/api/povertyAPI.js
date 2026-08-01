import axiosInstance from "../configs/axiosInstance";

const BASE = "/api/poverty";

// Pure endpoint calls only -- no logic, no transformation.
// Business logic that USES these lives in services/povertyService.js.

export const getActuals = (params) =>
  axiosInstance.get(`${BASE}/actuals`, { params });

export const deleteActual = (year, region = "NCR") =>
  axiosInstance.delete(`${BASE}/actuals/${year}`, { params: { region } });

export const getLatestForecasts = (region) =>
  axiosInstance.get(`${BASE}/forecasts/latest`, { params: { region } });

export const getLatestPredictions = (region) =>
  axiosInstance.get(`${BASE}/predictions/latest`, { params: { region } });

export const getModelComparison = () =>
  axiosInstance.get(`${BASE}/models/comparison`);

export const getTimeline = (region) =>
  axiosInstance.get(`${BASE}/timeline`, { params: { region } });

export const runForecast = () =>
  axiosInstance.post(`${BASE}/pipeline/forecast`);

export const runTrainAndEvaluate = () =>
  axiosInstance.post(`${BASE}/pipeline/train`);

export const runPredict = () =>
  axiosInstance.post(`${BASE}/pipeline/predict`);

export const runFullPipeline = () =>
  axiosInstance.post(`${BASE}/pipeline/run-full`);

export const getTrainStatus = () =>
  axiosInstance.get(`${BASE}/pipeline/train-status`);