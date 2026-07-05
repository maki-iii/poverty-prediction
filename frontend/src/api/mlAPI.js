import axios from "axios";

const API = axios.create({
    baseURL: "/api/ml",
    withCredentials: true,
});

export const uploadDataset = (formData, onUploadProgress) =>
    API.post("/upload", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
        onUploadProgress,
    });

export const getRegionalData = () =>
    API.get("/regional-data");

export const getDatasets = () =>
    API.get("/datasets");

export const mergeDatasets = (uploadIds) =>
    API.post("/datasets/merge", {
        upload_ids: uploadIds,
    });

export const archiveDataset = (id, data) =>
    API.post(`/datasets/${id}/archive`, data);

export const preprocessDataset = () =>
    API.post("/preprocess");

export const trainModels = () =>
    API.post("/train");

export const getTrainingStatus = () =>
    API.get("/training-status");

export const getMetrics = () =>
    API.get("/metrics");

export const getPredictions = () =>
    API.get("/predictions");

export const getForecast = () =>
    API.get("/forecast");

export const getStatus = () =>
    API.get("/status");

export default {
    uploadDataset,
    getDatasets,
    mergeDatasets,
    archiveDataset,
    preprocessDataset,
    trainModels,
    getTrainingStatus,
    getMetrics,
    getPredictions,
    getForecast,
    getStatus,
};