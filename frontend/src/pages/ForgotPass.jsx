import { useState } from "react";
import { X, AtSign, Lock, Eye, EyeOff, KeyRound } from "lucide-react";
import { sendOTP, verifyOTP, resetPassword } from "../api/otpAPI";
import { Alert } from "../components/common/Alert";
import Loader from "../components/common/Loader";

const STEPS = { EMAIL: 1, OTP: 2, PASSWORD: 3 };

export default function ForgotPasswordModal({ isOpen, onClose }) {
  const [step, setStep]               = useState(STEPS.EMAIL);
  const [email, setEmail]             = useState("");
  const [otp, setOtp]                 = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [alert, setAlert]             = useState(null);
  const [loading, setLoading]         = useState(false);

  if (!isOpen) return null;

  const resetAll = () => {
    setStep(STEPS.EMAIL);
    setEmail("");
    setOtp("");
    setNewPassword("");
    setShowPassword(false);
    setAlert(null);
  };

  const handleClose = () => {
    resetAll();
    onClose();
  };

  // Step 1 — Send OTP
  const handleSendOTP = async () => {
    setAlert(null);
    if (!email) {
      setAlert({ type: "warning", message: "Please enter your email." });
      return;
    }
    try {
      setLoading(true);
      await sendOTP(email);
      setAlert({ type: "success", message: "OTP sent to your email." });
      setStep(STEPS.OTP);
    } catch (err) {
      setAlert({
        type: "error",
        message: err.response?.data?.message || "Failed to send OTP.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Step 2 — Verify OTP
  const handleVerifyOTP = async () => {
    setAlert(null);
    if (!otp) {
      setAlert({ type: "warning", message: "Please enter the OTP." });
      return;
    }
    try {
      setLoading(true);
      await verifyOTP(email, otp);
      setAlert({ type: "success", message: "OTP verified!" });
      setStep(STEPS.PASSWORD);
    } catch (err) {
      setAlert({
        type: "error",
        message: err.response?.data?.message || "Invalid or expired OTP.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Step 3 — Reset Password
  const handleResetPassword = async () => {
    setAlert(null);
    if (!newPassword) {
      setAlert({ type: "warning", message: "Please enter a new password." });
      return;
    }
    try {
      setLoading(true);
      await resetPassword(email, newPassword);
      setAlert({ type: "success", message: "Password reset successfully!" });
      setTimeout(() => handleClose(), 1500);
    } catch (err) {
      setAlert({
        type: "error",
        message: err.response?.data?.message || "Failed to reset password.",
      });
    } finally {
      setLoading(false);
    }
  };

  const stepLabel = {
    [STEPS.EMAIL]:    "Enter your email",
    [STEPS.OTP]:      "Enter OTP",
    [STEPS.PASSWORD]: "Set new password",
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 w-full bg-[#002366]" />

        <div className="p-7">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-[#002366] tracking-tight">
                Forgot Password
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{stepLabel[step]}</p>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-2 mb-6">
            {[STEPS.EMAIL, STEPS.OTP, STEPS.PASSWORD].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  step >= s ? "bg-[#002366]" : "bg-slate-200"
                }`}
              />
            ))}
          </div>

          <div className="flex flex-col gap-4">
            {alert && (
              <Alert
                type={alert.type}
                message={alert.message}
                onClose={() => setAlert(null)}
              />
            )}

            {/* Step 1 — Email */}
            {step === STEPS.EMAIL && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">Email</label>
                  <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 h-11 bg-slate-50 focus-within:bg-white focus-within:border-[#002366] focus-within:ring-2 focus-within:ring-[#002366]/10 transition-all">
                    <AtSign className="h-4 w-4 text-slate-400 shrink-0" />
                    <input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSendOTP}
                  disabled={loading}
                  className="w-full h-11 rounded-xl bg-[#002366] text-white text-sm font-semibold hover:bg-[#001a4d] active:scale-[0.98] transition-all duration-150 shadow-md shadow-[#002366]/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? <><Loader /><span>Sending...</span></> : "Send OTP"}
                </button>
              </>
            )}

            {/* Step 2 — OTP */}
            {step === STEPS.OTP && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">OTP Code</label>
                  <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 h-11 bg-slate-50 focus-within:bg-white focus-within:border-[#002366] focus-within:ring-2 focus-within:ring-[#002366]/10 transition-all">
                    <KeyRound className="h-4 w-4 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Enter 6-digit OTP"
                      value={otp}
                      maxLength={6}
                      onChange={(e) => setOtp(e.target.value)}
                      className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none tracking-widest"
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    OTP sent to <span className="font-medium text-slate-600">{email}</span>
                  </p>
                </div>

                <button
                  onClick={handleVerifyOTP}
                  disabled={loading}
                  className="w-full h-11 rounded-xl bg-[#002366] text-white text-sm font-semibold hover:bg-[#001a4d] active:scale-[0.98] transition-all duration-150 shadow-md shadow-[#002366]/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? <><Loader /><span>Verifying...</span></> : "Verify OTP"}
                </button>

                <button
                  onClick={() => { setStep(STEPS.EMAIL); setAlert(null); }}
                  className="text-xs text-center text-[#002366] hover:underline"
                >
                  Use a different email
                </button>
              </>
            )}

            {/* Step 3 — New Password */}
            {step === STEPS.PASSWORD && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">New Password</label>
                  <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 h-11 bg-slate-50 focus-within:bg-white focus-within:border-[#002366] focus-within:ring-2 focus-within:ring-[#002366]/10 transition-all">
                    <Lock className="h-4 w-4 text-slate-400 shrink-0" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="text-slate-400 hover:text-slate-600 transition"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Min 8 characters, uppercase, lowercase, and a special character.
                  </p>
                </div>

                <button
                  onClick={handleResetPassword}
                  disabled={loading}
                  className="w-full h-11 rounded-xl bg-[#002366] text-white text-sm font-semibold hover:bg-[#001a4d] active:scale-[0.98] transition-all duration-150 shadow-md shadow-[#002366]/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? <><Loader /><span>Resetting...</span></> : "Reset Password"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}