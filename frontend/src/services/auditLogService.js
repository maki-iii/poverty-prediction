import * as AuditLogApi from "../api/auditLogApi";

const AuditLogService = {
  getLogs: async (page = 1, pageSize = 20) => {
    const { data } = await AuditLogApi.getAuditLogs(page, pageSize);
    return data;
  },
};

export default AuditLogService;