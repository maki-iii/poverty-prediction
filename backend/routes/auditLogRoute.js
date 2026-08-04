const express = require("express");
const AuditLogController = require("../controllers/auditLogController");
const verifyToken = require("../middlewares/authMiddleware");
const verifyAdmin = require("../middlewares/adminMiddleware");

const router = express.Router();

router.get("/", verifyToken, verifyAdmin, AuditLogController.getLogs);

module.exports = router;