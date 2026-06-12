import { useState } from "react";
import { X, Mail, Lock, User, Eye, EyeOff, AtSign, MapPin } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook } from "react-icons/fa";
import { authService } from "../../services/authService";
import { socialAuthService } from "../../services/socialAuthService";
import { Alert } from "../common/Alert";
import Loader from "../common/Loader";
import ConfirmModal from "../common/ConfirmModal";

const EMPTY_FORM = {
  name: "", username: "", email: "", address: "", password: "", confirmPassword: "",
};

const Field = ({ label, icon: Icon, type = "text", placeholder, name, value, onChange }) => (
  <div className="flex flex-col gap-1 min-w-0">
    <label className="text-xs font-semibold text-slate-700">{label}</label>
    <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 h-10 bg-slate-50 focus-within:bg-white focus-within:border-[#002366] focus-within:ring-2 focus-within:ring-[#002366]/10 transition-all min-w-0">
      <Icon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="flex-1 bg-transparent text-xs text-slate-800 placeholder:text-slate-400 outline-none min-w-0"
      />
    </div>
  </div>
);

export default function SignUpModal({ isOpen, onClose, onSwitchToLogin }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  if (!isOpen) return null;

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setAgreed(false);
    setAlert(null);
    setShowPassword(false);
    setShowConfirm(false);
    setShowConfirmModal(false);
    setShowExitModal(false);
  };

  const handleClose = () => {
    const hasData = Object.values(form).some((v) => v.trim() !== "");
    if (hasData) {
      setShowExitModal(true);
    } else {
      onClose();
    }
  };

  const handleExitConfirmed = () => {
    resetForm();
    onClose();
  };

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleReview = () => {
    setAlert(null);
    const { name, username, email, address, password, confirmPassword } = form;

    if (!name || !username || !email || !address || !password || !confirmPassword) {
      setAlert({ type: "warning", message: "Please fill in all fields." });
      return;
    }
    if (password !== confirmPassword) {
      setAlert({ type: "error", message: "Passwords do not match." });
      return;
    }
    if (!agreed) {
      setAlert({ type: "warning", message: "Please agree to the Terms of Service." });
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmedSubmit = async () => {
    setShowConfirmModal(false);
    const { name, username, email, address, password } = form;

    try {
      setLoading(true);
      await authService.register({ name, username, email, address, password });
      setAlert({ type: "success", message: "Account created! Redirecting to login..." });
      resetForm();
      setTimeout(() => onSwitchToLogin(), 1500);
    } catch (err) {
      setAlert({
        type: "error",
        message: err.response?.data?.message || "Registration failed. Please try again.",
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
      setAlert({ type: "success", message: "Account ready! Redirecting..." });
      resetForm();
      setTimeout(() => onClose(), 1000);
    } catch (err) {
      setAlert({
        type: "error",
        message: err.response?.data?.message || "Social login failed. Please try again.",
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
          className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-1 w-full bg-[#002366] sticky top-0" />

          <div className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-xl font-bold text-[#002366] tracking-tight">Create account</h2>
                <p className="text-xs text-slate-500 mt-0.5">Join PLPS — it's free to get started</p>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {alert && (
                <Alert
                  type={alert.type}
                  message={alert.message}
                  onClose={() => setAlert(null)}
                />
              )}

              <div className="grid grid-cols-2 gap-3">
                <Field label="Full Name" icon={User} placeholder="Full name" name="name" value={form.name} onChange={handleChange} />
                <Field label="Username" icon={AtSign} placeholder="username" name="username" value={form.username} onChange={handleChange} />
              </div>

              <Field label="Email" icon={Mail} type="email" placeholder="your@email.com" name="email" value={form.email} onChange={handleChange} />
              <Field label="Address" icon={MapPin} placeholder="City, Province" name="address" value={form.address} onChange={handleChange} />

              {/* Password */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">Password</label>
                <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 h-10 bg-slate-50 focus-within:bg-white focus-within:border-[#002366] focus-within:ring-2 focus-within:ring-[#002366]/10 transition-all">
                  <Lock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
                    value={form.password}
                    onChange={handleChange}
                    className="flex-1 bg-transparent text-xs text-slate-800 placeholder:text-slate-400 outline-none"
                  />
                  <button type="button" onClick={() => setShowPassword((p) => !p)} className="text-slate-400 hover:text-slate-600 transition">
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">Confirm Password</label>
                <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 h-10 bg-slate-50 focus-within:bg-white focus-within:border-[#002366] focus-within:ring-2 focus-within:ring-[#002366]/10 transition-all">
                  <Lock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <input
                    name="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    className="flex-1 bg-transparent text-xs text-slate-800 placeholder:text-slate-400 outline-none"
                  />
                  <button type="button" onClick={() => setShowConfirm((p) => !p)} className="text-slate-400 hover:text-slate-600 transition">
                    {showConfirm ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Terms */}
              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 w-3.5 h-3.5 rounded border-slate-300 accent-[#002366]"
                />
                <span className="text-xs text-slate-600 leading-snug">
                  I agree to the{" "}
                  <span className="font-semibold text-[#002366] hover:underline cursor-pointer">Terms of Service</span>
                  {" "}and{" "}
                  <span className="font-semibold text-[#002366] hover:underline cursor-pointer">Privacy Policy</span>
                </span>
              </label>

              {/* Submit */}
              <button
                onClick={handleReview}
                disabled={loading}
                className="w-full h-11 rounded-xl bg-[#002366] text-white text-sm font-semibold hover:bg-[#001a4d] active:scale-[0.98] transition-all duration-150 shadow-md shadow-[#002366]/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader />
                    <span>Creating account...</span>
                  </>
                ) : (
                  "Create Account"
                )}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-[11px] text-slate-400 font-medium">or sign up with</span>
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
                Already have an account?{" "}
                <button onClick={onSwitchToLogin} className="font-semibold text-[#002366] hover:underline">
                  Sign In
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Confirm details before submitting ── */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onConfirm={handleConfirmedSubmit}
        onCancel={() => setShowConfirmModal(false)}
        title="Confirm your details"
        subtitle="Please review before creating your account"
        confirmLabel="Confirm & Create"
        cancelLabel="Go Back & Edit"
        warning="Make sure your details are correct. You can update them in your profile after signing up."
        fields={[
          { key: "name",     label: "Full Name", value: form.name,     icon: User   },
          { key: "username", label: "Username",  value: form.username, icon: AtSign },
          { key: "email",    label: "Email",     value: form.email,    icon: Mail   },
          { key: "address",  label: "Address",   value: form.address,  icon: MapPin },
          { key: "password", label: "Password",  value: form.password, icon: Lock, mask: true },
        ]}
      />

      {/* ── Exit guard — unsaved changes warning ── */}
      <ConfirmModal
        isOpen={showExitModal}
        onConfirm={handleExitConfirmed}
        onCancel={() => setShowExitModal(false)}
        title="Discard changes?"
        subtitle="You have unsaved information in this form"
        confirmLabel="Yes, discard"
        cancelLabel="Keep editing"
        warning="All details you've entered will be lost if you leave now."
        fields={[]}
      />
    </>
  );
}