import { useState } from "react";
import { X, AtSign, Lock, Eye, EyeOff } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

import { authService } from "../../services/authService";
import { socialAuthService } from "../../services/socialAuthService";
import { Alert } from "../common/Alert";
import Loader from "../common/Loader";
import ForgotPasswordModal from "../../pages/ForgotPass";
const EMPTY_FORM = { username: "", password: "" };

export default function LoginModal({ isOpen, onClose, onSwitchToSignUp }) {
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember]         = useState(false);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [alert, setAlert]               = useState(null);
  const [loading, setLoading]           = useState(false);
  const [showForgot, setShowForgot]     = useState(false);
  const navigate = useNavigate();

  if (!isOpen) return null;

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setRemember(false);
    setAlert(null);
    setShowPassword(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    setAlert(null);
    if (!form.username || !form.password) {
      setAlert({ type: "warning", message: "Please fill in all fields." });
      return;
    }
    try {
      setLoading(true);
      const response = await authService.login(form);
      setAlert({ type: "success", message: "Login successful! Redirecting..." });
      resetForm();
      setTimeout(() => {
        onClose();
        navigate("/user/dashboard");
      }, 1000);
    } catch (err) {
      setAlert({
        type: "error",
        message: err.response?.data?.message || "Invalid username or password.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (providerFn) => {
    setAlert(null);
    try {
      setLoading(true);
      await providerFn();
      setAlert({ type: "success", message: "Login successful! Redirecting..." });
      resetForm();
      setTimeout(() => {
        onClose();
        navigate("/user/dashboard");
      }, 1000);
    } catch (err) {
      console.error(err);
      let message = "Social login failed. Please try again.";
      
      if (err.code === "auth/account-exists-with-different-credential") {
        message = "The email you used is already linked to a different login method. Please use your original login method.";
      }
      setAlert({
        type: "error",
        message: err.response?.data?.message || err.message || message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
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
                <h2 className="text-xl font-bold text-[#002366] tracking-tight">Welcome back</h2>
                <p className="text-xs text-slate-500 mt-0.5">Sign in to your PLPS account</p>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {alert && (
                <Alert
                  type={alert.type}
                  message={alert.message}
                  onClose={() => setAlert(null)}
                />
              )}

              {/* Username */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">Username</label>
                <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 h-11 bg-slate-50 focus-within:bg-white focus-within:border-[#002366] focus-within:ring-2 focus-within:ring-[#002366]/10 transition-all">
                  <AtSign className="h-4 w-4 text-slate-400 shrink-0" />
                  <input
                    name="username"
                    type="text"
                    placeholder="Enter your username"
                    value={form.username}
                    onChange={handleChange}
                    className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">Password</label>
                <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 h-11 bg-slate-50 focus-within:bg-white focus-within:border-[#002366] focus-within:ring-2 focus-within:ring-[#002366]/10 transition-all">
                  <Lock className="h-4 w-4 text-slate-400 shrink-0" />
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={handleChange}
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
              </div>

              {/* Remember + Forgot */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-300 accent-[#002366]"
                  />
                  <span className="text-xs text-slate-600">Remember me</span>
                </label>
                <button
                  onClick={() => setShowForgot(true)}
                  className="text-xs font-medium text-[#002366] hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full h-11 rounded-xl bg-[#002366] text-white text-sm font-semibold hover:bg-[#001a4d] active:scale-[0.98] transition-all duration-150 shadow-md shadow-[#002366]/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader />
                    <span>Signing in...</span>
                  </>
                ) : (
                  "Sign In"
                )}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-[11px] text-slate-400 font-medium">or continue with</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              {/* Social */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleSocialLogin(socialAuthService.loginWithGoogle)}
                  disabled={loading}
                  className="h-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center gap-2 text-xs font-medium text-slate-700 hover:border-[#002366]/40 hover:bg-slate-50 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <FcGoogle className="h-4 w-4" />
                  Google
                </button>
                <button
                  onClick={() => handleSocialLogin(socialAuthService.loginWithFacebook)}
                  disabled={loading}
                  className="h-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center gap-2 text-xs font-medium text-slate-700 hover:border-[#002366]/40 hover:bg-slate-50 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <FaFacebook className="h-4 w-4 text-[#1877F2]" />
                  Facebook
                </button>
              </div>

              <p className="text-center text-xs text-slate-500">
                Don't have an account?{" "}
                <button
                  onClick={onSwitchToSignUp}
                  className="font-semibold text-[#002366] hover:underline"
                >
                  Sign Up
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={showForgot}
        onClose={() => setShowForgot(false)}
      />
    </>
  );
}