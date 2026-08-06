import axiosInstance from "../configs/axiosInstance";

const BASE = "/api/datasets";

// Pure endpoint calls only -- no logic, no transformation.
// Business logic that USES these lives in services/datasetService.js.

export const uploadDataset = (file, onProgress) => {
  const formData = new FormData();
  formData.append("file", file);

  return axiosInstance.post(`${BASE}/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
        onProgress(percent);
      }
    },
  });
};

export const getProcessStatus = (datasetId) =>
  axiosInstance.get(`${BASE}/${datasetId}/process-status`);

export const processDataset = (datasetId, { surveyType, year, inflationRate, povertyIncidence }) =>
  axiosInstance.post(`${BASE}/${datasetId}/process`, {
    surveyType,
    year,
    inflationRate,
    povertyIncidence,
  });

export const listDatasets = (status) =>
  axiosInstance.get(BASE, { params: { status } });

export const mergeDataset = (datasetId) =>
  axiosInstance.post(`${BASE}/${datasetId}/merge`);

export const deleteDataset = (datasetId) =>
  axiosInstance.delete(`${BASE}/${datasetId}`);