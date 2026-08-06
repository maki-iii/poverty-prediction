const DatasetService = require("../services/datasetService");
const AuditLogService = require("../services/auditLogService");

const DatasetController = {

  // POST /api/datasets/upload
  uploadDataset: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const uploadedBy = req.user?.username || null;
      const result = await DatasetService.uploadDataset(req.file.buffer, req.file.originalname, uploadedBy);

      await AuditLogService.log({
        userId: req.user?.id ?? null,
        username: req.user?.username || null,
        action: AuditLogService.ACTIONS.UPLOAD,
        details: `Uploaded dataset "${req.file.originalname}"`,
      });

      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },

  // GET /api/datasets
  listDatasets: async (req, res) => {
    try {
      const { status } = req.query;
      const data = await DatasetService.listDatasets(status);
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },

  // POST /api/datasets/:id/merge
  mergeDataset: async (req, res) => {
    try {
      const { id } = req.params;
      const result = await DatasetService.mergeDataset(id);

      await AuditLogService.log({
        userId: req.user?.id ?? null,
        username: req.user?.username || null,
        action: AuditLogService.ACTIONS.MERGE,
        details: `Merged "${result.filename}" into actuals`,
      });

      return res.status(200).json(result);
    } catch (error) {
      const notFound = error.message.includes("not found");
      const badRequest = error.message.includes("already merged");
      const status = notFound ? 404 : badRequest ? 400 : 500;
      return res.status(status).json({ message: error.message });
    }
  },

  // DELETE /api/datasets/:id
  deleteDataset: async (req, res) => {
    try {
      const { id } = req.params;
      const result = await DatasetService.deleteDataset(id);

      await AuditLogService.log({
        userId: req.user?.id ?? null,
        username: req.user?.username || null,
        action: AuditLogService.ACTIONS.DATASET_DELETION,
        details: `Deleted "${result.filename}"`,
      });

      return res.status(200).json(result);
    } catch (error) {
      const notFound = error.message.includes("not found");
      return res.status(notFound ? 404 : 500).json({ message: error.message });
    }
  },

  // POST /api/datasets/:id/process
  processDataset: async (req, res) => {
    try {
      const { id } = req.params;
      const { surveyType, year, inflationRate, povertyIncidence } = req.body;

      if (!surveyType || !year || inflationRate === undefined || povertyIncidence === undefined) {
        return res.status(400).json({
          message: "surveyType, year, inflationRate, and povertyIncidence are all required",
        });
      }

      const result = await DatasetService.processDataset(id, {
        surveyType,
        year,
        inflationRate,
        povertyIncidence,
      });

      await AuditLogService.log({
        userId: req.user?.id ?? null,
        username: req.user?.username || null,
        action: AuditLogService.ACTIONS.PROCESS,
        details: `Processed "${result.original_filename}"`,
      });

      return res.status(200).json(result);
    } catch (error) {
      const notFound = error.message.includes("not found");
      const badRequest = error.message.includes("only") || error.message.includes("status");
      const status = notFound ? 404 : badRequest ? 400 : 500;
      return res.status(status).json({ message: error.message });
    }
  },

};

module.exports = DatasetController;