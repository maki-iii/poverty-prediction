const AuditLogService = require("../services/auditLogService");

const AuditLogController = {

  // GET /api/audit-logs
  getLogs: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 20;

      const result = await AuditLogService.getLogs({ page, pageSize });
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },

};

module.exports = AuditLogController;