const db = require("../configs/db");
const bcrypt = require("bcrypt");

const User = {

  create: async ({ name, username, password, email, address, role = "user", uid = null }) => {
    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      `INSERT INTO users 
      (name, username, password, email, address, role, uid) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, username, hashedPassword, email, address, role, uid]
    );
    return result.insertId;
  },

  // Find by email
  findByEmail: async (email) => {
    const [rows] = await db.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );
    return rows[0];
  },

  // Find by username
  findByUsername: async (username) => {
    const [rows] = await db.query(
      "SELECT * FROM users WHERE username = ?",
      [username]
    );
    return rows[0];
  },

  // Check username
  checkUsername: async (username) => {
    const [rows] = await db.query(
      "SELECT id FROM users WHERE username = ?",
      [username]
    );
    return rows.length > 0;
  },

  // Find by ID
  findById: async (id) => {
    const [rows] = await db.query(
      "SELECT id, name, email, role, username, address, uid FROM users WHERE id = ?",
      [id]
    );
    return rows[0];
  },

  // Find user with password by ID
  findByIdWithPassword: async (id) => {
    const [rows] = await db.query(
      "SELECT id, name, email, role, username, address, password, uid FROM users WHERE id = ?",
      [id]
    );
    return rows[0];
  },

  // Check email
  checkEmail: async (email) => {
    const [rows] = await db.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );
    return rows.length > 0;
  },

  // Get all users
  getAll: async () => {
    const [rows] = await db.query(
      "SELECT id, name, email, role, username, email, address, created_at FROM users"
    );
    return rows;
  },

  // Update user
  update: async (id, { name, address, email }) => {
    const [result] = await db.query(
      `UPDATE users 
       SET name = ?, address = ?, email = ?
       WHERE id = ?`,
      [name, address, email, id]
    );
    return result.affectedRows;
  },

  updatePassword: async (id, hashedPassword) => {
    const [result] = await db.query(
      `UPDATE users SET password = ? WHERE id = ?`,
      [hashedPassword, id]
    );
    return result;
  },

  // Delete user
  delete: async (id) => {
    const [result] = await db.query(
      "DELETE FROM users WHERE id = ?",
      [id]
    );
    return result.affectedRows;
  }

};

module.exports = User;