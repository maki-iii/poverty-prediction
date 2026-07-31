const axios = require("axios");
const FormData = require("form-data");
const mlApiConfig = require("../configs/mlApi.config");

const mlApi = axios.create({
  baseURL: mlApiConfig.baseURL,
  timeout: mlApiConfig.timeout,
});

const DatasetService = {

uploadDataset: async (fileBuffer, filename, uploadedBy) => {
    try {
      const form = new FormData();
      form.append("file", fileBuffer, filename);
      if (uploadedBy) {
        form.append("uploaded_by", uploadedBy);
      }

      const { data } = await mlApi.post("/datasets/upload", form, {
        headers: form.getHeaders(),
      });
      return data;
    } catch (err) {
      throw new Error(`Upload failed: ${err.response?.data?.detail || err.message}`);
    }
  },

  listDatasets: async (status) => {
    try {
      const { data } = await mlApi.get("/datasets", { params: { status } });
      return data;
    } catch (err) {
      throw new Error(`Failed to list datasets: ${err.response?.data?.detail || err.message}`);
    }
  },

  mergeDataset: async (datasetId) => {
    try {
      const { data } = await mlApi.post(`/datasets/${datasetId}/merge`);
      return data;
    } catch (err) {
      throw new Error(`Merge failed: ${err.response?.data?.detail || err.message}`);
    }
  },

  deleteDataset: async (datasetId) => {
    try {
      const { data } = await mlApi.delete(`/datasets/${datasetId}`);
      return data;
    } catch (err) {
      throw new Error(`Delete failed: ${err.response?.data?.detail || err.message}`);
    }
  },

  processDataset: async (datasetId, { surveyType, year, inflationRate, povertyIncidence }) => {
    try {
      const { data } = await mlApi.post(`/datasets/${datasetId}/process`, {
        survey_type: surveyType,
        year,
        inflation_rate: inflationRate,
        poverty_incidence: povertyIncidence,
      });
      return data;
    } catch (err) {
      throw new Error(`Processing failed: ${err.response?.data?.detail || err.message}`);
    }
  },

};

module.exports = DatasetService;