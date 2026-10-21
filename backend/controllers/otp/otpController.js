const otpService = require("../../services/otp/otpService");
const emailService = require("../../services/otp/emailService");
const UserService = require("../../services/userService");
const User = require("../../models/userModel");

const otpController = {

  // POST /api/otp/send
  sendOTP: async (req, res) => {
    try {
      const email = otpService.normalizeEmail(req.body.email);

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "No account found with that email" });
      }

      const otp = otpService.generate(email);
      await emailService.sendOTP(email, otp);

      return res.status(200).json({ message: "OTP sent to your email" });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },

  // POST /api/otp/verify
  verifyOTP: async (req, res) => {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({ message: "Email and OTP are required" });
      }

      const resetToken = otpService.verify(email, otp);

      res.set("Cache-Control", "no-store");
      return res.status(200).json({ message: "OTP verified successfully", resetToken });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  },

  // POST /api/otp/reset-password
  resetPassword: async (req, res) => {
    try {
      const { email, newPassword, resetToken } = req.body;

      if (!email || !newPassword) {
        return res.status(400).json({ message: "Email and new password are required" });
      }

      const result = await UserService.resetPassword(email, newPassword, resetToken);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(400).json({ message: error.message, code: error.code });
    }
  },
};

module.exports = otpController;
