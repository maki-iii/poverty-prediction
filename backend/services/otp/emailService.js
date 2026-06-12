const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const emailService = {
  sendOTP: async (email, otp) => {
    await transporter.sendMail({
      from: `"PPS-PH" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Password Reset OTP",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 400px; margin: auto;">
          <h2>Forgot Password</h2>
          <p>Use the OTP below to reset your password. It expires in <strong>5 minutes</strong>.</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 10px; margin: 20px 0;">
            ${otp}
          </div>
          <p>If you did not request this, please ignore this email.</p>
        </div>
      `,
    });
  },
};

module.exports = emailService;