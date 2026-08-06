import * as DatasetApi from "../api/datasetApi";

// Business logic for dataset management -- upload, list, merge, delete.
// Components/hooks call THIS, never api/datasetApi.js directly.

const DatasetService = {

  uploadDataset: async (file, onProgress) => {
    const { data } = await DatasetApi.uploadDataset(file, onProgress);
    return data;
  },

  getProcessStatus: async (datasetId) => {
    const { data } = await DatasetApi.getProcessStatus(datasetId);
    return data;
  },

  listDatasets: async (status) => {
    const { data } = await DatasetApi.listDatasets(status);
    return data;
  },

  mergeDataset: async (datasetId) => {
    const { data } = await DatasetApi.mergeDataset(datasetId);
    return data;
  },

  deleteDataset: async (datasetId) => {
    const { data } = await DatasetApi.deleteDataset(datasetId);
    return data;
  },

  processDataset: async (datasetId, { surveyType, year, inflationRate, povertyIncidence }) => {
    const { data } = await DatasetApi.processDataset(datasetId, {
      surveyType,
      year,
      inflationRate,
      povertyIncidence,
    });
    return data;
  },

};

export default DatasetService;