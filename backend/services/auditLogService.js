const AuditLog = require("../models/auditLogModel");

// Central list of loggable actions -- import these constants everywhere
// instead of typing raw strings, so action names stay consistent.
const ACTIONS = {
  // ML pipeline
  TRAINING: "training",
  FORECAST: "forecast",
  PREDICT: "predict",
  RUN_FULL_PIPELINE: "run_full_pipeline",
  UPLOAD: "upload",
  PROCESS: "process",
  MERGE: "merge",
  DATASET_DELETION: "dataset_deletion",
  ACTUALS_DELETION: "actuals_deletion",
  ACTUALS_MERGE: "actuals_merge",

  // User management
  USER_CREATION: "user_creation",
  USER_DELETION: "user_deletion",
  USER_CHANGE_PASSWORD: "user_change_password",
  USER_UPDATE: "user_update",
};

const AuditLogService = {

  ACTIONS,

  log: async ({ userId = null, username, action, details = null }) => {
    if (!username) {
      username = "Unknown";
    }
    try {
      await AuditLog.create({ userId, username, action, details });
    } catch (err) {
      // Audit logging failure should never break the actual operation --
      // just log it server-side and move on.
      console.error("[AuditLogService] Failed to write audit log:", err.message);
    }
  },

  getLogs: async ({ page = 1, pageSize = 20 } = {}) => {
    const limit = pageSize;
    const offset = (page - 1) * pageSize;

    const [logs, total] = await Promise.all([
      AuditLog.getAll({ limit, offset }),
      AuditLog.count(),
    ]);

    return {
      logs,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },

};

module.exports = AuditLogService;