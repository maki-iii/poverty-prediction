const crypto = require("crypto");

const normalizeEmail = (email) => {
  if (typeof email !== "string" || email.trim().length > 320 || !email.includes("@")) {
    throw new Error("A valid email is required.");
  }
  return email.trim().toLowerCase();
};

// One backend worker owns these short-lived challenges. A restart invalidates them.
function createOtpService(now = Date.now) {
  const records = new Map();
  const digest = value => crypto.createHash("sha256").update(value).digest();
  const prune = () => {
    for (const [email, record] of records) {
      if (now() >= record.expiresAt) records.delete(email);
    }
  };
  return {
    normalizeEmail,
    generate(email) {
      email = normalizeEmail(email);
      prune();
      const previous = records.get(email);
      if (previous && now() - previous.sentAt < 60_000) {
        throw new Error("Please wait one minute before requesting another OTP.");
      }
      if (!previous && records.size >= 10000) throw new Error("Please try again later.");
      const otp = crypto.randomInt(100000, 1000000).toString();
      records.set(email, { otpHash: digest(otp), attempts: 0, sentAt: now(), expiresAt: now() + 300_000 });
      return otp;
    },
    verify(email, inputOtp) {
      email = normalizeEmail(email);
      prune();
      const record = records.get(email);
      if (!record?.otpHash || record.attempts >= 5) {
        throw new Error("OTP expired or unavailable. Please request a new one.");
      }
      record.attempts++;
      if (typeof inputOtp !== "string" || !crypto.timingSafeEqual(record.otpHash, digest(inputOtp))) {
        throw new Error("Invalid OTP.");
      }
      const resetToken = crypto.randomBytes(32).toString("hex");
      delete record.otpHash;
      record.resetHash = digest(resetToken);
      record.expiresAt = now() + 300_000;
      return resetToken;
    },
    consumeReset(email, resetToken) {
      email = normalizeEmail(email);
      prune();
      const record = records.get(email);
      if (typeof resetToken !== "string" || !record?.resetHash ||
          !crypto.timingSafeEqual(record.resetHash, digest(resetToken))) {
        const error = new Error("Password reset authorization is invalid or expired. Please verify a new OTP.");
        error.code = "RESET_AUTH_REQUIRED";
        throw error;
      }
      // Consume synchronously, before any database work, to prevent concurrent replay.
      records.delete(email);
    },
  };
}

module.exports = createOtpService();
module.exports.createOtpService = createOtpService;
