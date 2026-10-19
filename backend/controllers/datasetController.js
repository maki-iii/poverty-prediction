const DatasetService = require("../services/datasetService");
const AuditLogService = require("../services/auditLogService");

const DatasetController = {

    // POST /api/datasets/upload
  uploadDataset: async (req, res) => {
    const fs = require("fs");
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const uploadedBy = req.user?.username || null;
      const result = await DatasetService.uploadDataset(
        req.file.path,
        req.file.originalname,
        uploadedBy
      );

      await AuditLogService.log({
        userId: req.user?.id ?? null,
        username: req.user?.username || null,
        action: AuditLogService.ACTIONS.UPLOAD,
        details: `Uploaded dataset "${req.file.originalname}"`,
      });

      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    } finally {
      // Clean up the temp file regardless of success/failure
      if (req.file?.path) {
        fs.unlink(req.file.path, () => {});
      }
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
  // POST /api/datasets/:id/process
  processDataset: async (req, res) => {
    try {
      const { id } = req.params;
      const { surveyType = "fies", year, povertyThreshold, povertyIncidence } = req.body;

      if (surveyType !== "fies" || !Number.isInteger(year) || year < 1900 || year > 2100 ||
          typeof povertyThreshold !== "number" || !Number.isFinite(povertyThreshold) || povertyThreshold <= 0 ||
          typeof povertyIncidence !== "number" || !Number.isFinite(povertyIncidence) || povertyIncidence < 0 || povertyIncidence > 100) {
        return res.status(400).json({
          message: "FIES, a valid year, a positive annual per-person poverty threshold, and poverty incidence between 0 and 100 are required",
        });
      }

      const result = await DatasetService.processDataset(id, {
        surveyType,
        year,
        povertyThreshold,
        povertyIncidence,
      });

      await AuditLogService.log({
        userId: req.user?.id ?? null,
        username: req.user?.username || null,
        action: AuditLogService.ACTIONS.PROCESS,
        details: `Started processing dataset id=${id}`,
      });

      return res.status(200).json(result);
    } catch (error) {
      const notFound = error.message.includes("not found");
      const badRequest = error.message.includes("only") || error.message.includes("status") || error.message.includes("already being processed");
      const status = notFound ? 404 : badRequest ? 400 : 500;
      return res.status(status).json({ message: error.message });
    }
  },

  // GET /api/datasets/:id/process-status
  getProcessStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const status = await DatasetService.getProcessStatus(id);
      return res.status(200).json(status);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },

};

module.exports = DatasetController;
