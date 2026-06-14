import { useState } from "react";
import { AtSign, Lock, Eye, EyeOff, ShieldCheck, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { authService } from "../../services/authService";
import { Alert } from "../../components/common/Alert";
import Loader from "../../components/common/Loader";


const EMPTY_FORM = { username: "", password: "" };

export default function AdminLogin() {
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { refetch } = useAuth();

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
      await authService.adminLogin(form);
      await refetch();
      navigate("/admin/dashboard");
    } catch (err) {
      setAlert({
        type: "error",
        message: err.response?.data?.message || "Invalid credentials. Access denied.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-[#002366] px-7 pt-7 pb-6 flex flex-col items-center text-center">

          {/* Badge */}
          <div className="relative mb-4">
            <div className="w-20 h-20 rounded-full bg-white/10 border-2 border-white/30 flex items-center justify-center shadow-xl">
              <ShieldCheck className="h-10 w-10 text-white" strokeWidth={1.5} />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#FCD116] rounded-full flex items-center justify-center shadow">
              <span className="text-[#002366] font-black text-[10px]">✓</span>
            </div>
          </div>

          <h1 className="text-white font-bold text-lg tracking-tight leading-tight">
            PPS Admin Portal
          </h1>
          <p className="text-blue-200 text-[11px] mt-1 tracking-wide uppercase">
            Poverty Prediction System
          </p>
          <p className="text-blue-300 text-[10px] mt-0.5">
            Authorized Personnel Only
          </p>
        </div>

        {/* Warning banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-start gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-700 leading-snug">
            This system is restricted to authorized administrators. Unauthorized access is prohibited and may be subject to legal action.
          </p>
        </div>

        <div className="p-7 flex flex-col gap-4">
          {alert && (
            <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
          )}

          {/* Username */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
              Username
            </label>
            <div className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 h-11 bg-slate-50 focus-within:bg-white focus-within:border-[#002366] focus-within:ring-2 focus-within:ring-[#002366]/10 transition-all">
              <AtSign className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                name="username"
                type="text"
                placeholder="Enter your username"
                value={form.username}
                onChange={handleChange}
                disabled={loading}
                className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none disabled:opacity-60"
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
              Password
            </label>
            <div className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 h-11 bg-slate-50 focus-within:bg-white focus-within:border-[#002366] focus-within:ring-2 focus-within:ring-[#002366]/10 transition-all">
              <Lock className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                disabled={loading}
                className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                disabled={loading}
                className="text-slate-400 hover:text-slate-600 transition disabled:opacity-40"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full h-11 rounded-lg bg-[#002366] text-white text-sm font-bold tracking-wide hover:bg-[#001a4d] active:scale-[0.98] transition-all duration-150 shadow-md shadow-[#002366]/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase"
          >
            {loading ? (
              <>
                <Loader />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                Secure Sign In
              </>
            )}
          </button>

          {/* Divider */}
          <div className="border-t border-slate-200 pt-3 flex flex-col gap-1 text-center">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
              Official Use Only
            </p>
            <p className="text-[10px] text-slate-400">
              All access attempts are monitored and logged.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="text-[10px] text-slate-400 mt-4 text-center">
        © {new Date().getFullYear()} Philippine Poverty Prediction System
      </p>
    </div>
  );
}