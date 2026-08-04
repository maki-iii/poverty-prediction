import axiosInstance from "../configs/axiosInstance";

const BASE = "/api/audit-logs";

export const getAuditLogs = (page = 1, pageSize = 20) =>
  axiosInstance.get(BASE, { params: { page, pageSize } });