const crypto = require("crypto");

// In-memory store: { email: { otp, expiresAt } }
const otpStore = new Map();

const otpService = {
  generate: (email) => {
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    otpStore.set(email, { otp, expiresAt });
    return otp;
  },

  verify: (email, inputOtp) => {
    const record = otpStore.get(email);

    if (!record) {
      throw new Error("OTP not found. Please request a new one.");
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(email);
      throw new Error("OTP has expired. Please request a new one.");
    }

    if (record.otp !== inputOtp) {
      throw new Error("Invalid OTP.");
    }

    otpStore.delete(email); // one-time use
    return true;
  },
};

module.exports = otpService;