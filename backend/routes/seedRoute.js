const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const db = require("../configs/db");

// Admin initial account
router.get("/seed-admin", async (req, res) => {
  try {
    const password = "Admin_Mark@0505";
    const hashedPassword = await bcrypt.hash(password, 10);

    // check if admin already exists
    const [existing] = await db.query(
      "SELECT * FROM users WHERE username = ?",
      ["Admin_Mark"]
    );

    if (existing.length > 0) {
      return res.json({ message: "Admin already exists" });
    }

    await db.query(
      `INSERT INTO users (name, username, password, email, address, role)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        "Admin",
        "Admin_Mark",
        hashedPassword,
        "adminmark@gmail.com",
        "Caloocan City",
        "admin"
      ]
    );

    res.json({
      message: "Admin created successfully",
      username: "Admin_Mark",
      password: "Admin_Mark@0505"
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
});

module.exports = router;