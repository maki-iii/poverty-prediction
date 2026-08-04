const db = require("../configs/db");

const AuditLog = {

  create: async ({ userId = null, username, action, details = null }) => {
    const [result] = await db.query(
      `INSERT INTO audit_logs (user_id, username, action, details)
       VALUES (?, ?, ?, ?)`,
      [userId, username, action, details]
    );
    return result.insertId;
  },

  getAll: async ({ limit = 50, offset = 0 } = {}) => {
    const [rows] = await db.query(
      `SELECT id, user_id, username, action, details, created_at
       FROM audit_logs
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    return rows;
  },

  count: async () => {
    const [rows] = await db.query("SELECT COUNT(*) as total FROM audit_logs");
    return rows[0].total;
  },

};

module.exports = AuditLog;