const express = require("express");
const router = express.Router();
const otpController = require("../../controllers/otp/otpController");

router.post("/send", otpController.sendOTP);
router.post("/verify", otpController.verifyOTP);
router.post("/reset-password", otpController.resetPassword);

module.exports = router;