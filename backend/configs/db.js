// config/db.js
require("dotenv").config({ path: __dirname + "/../.env" });
const mysql = require("mysql2/promise");

const db = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "poverty_prediction_db",
});

module.exports = db;