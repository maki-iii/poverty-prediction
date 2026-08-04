import { useState } from "react";
import { X, KeyRound } from "lucide-react";
import Loader from "../../common/Loader";

const inputClass =
  "w-full px-3 h-10 border border-slate-200 rounded-xl text-sm text-slate-800 " +
  "focus:outline-none focus:ring-2 focus:ring-[#002366]/30 focus:border-[#002366] transition";
const labelClass = "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5";

export default function ChangePasswordModal({ user, onClose, onSubmit, submitting }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  if (!user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!newPassword || !confirmPassword) {
      setError("Both fields are required.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      await onSubmit(user.id, newPassword);
      onClose();
    } catch (err) {
      setError(err.message || "Something went wrong");
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 w-full bg-gradient-to-r from-amber-500 to-amber-600" />

        <div className="p-6">
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0 bg-amber-100">
                <KeyRound className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#002366] tracking-tight">Change Password</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  For <span className="font-medium">{user.username}</span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                <p className="text-[11px] text-red-600 leading-snug">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="h-11 rounded-xl border border-slate-200 bg-white text-sm font-semibold
                           text-slate-600 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]
                           transition-all duration-150"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="h-11 rounded-xl bg-amber-600 text-white text-sm font-semibold
                           hover:bg-amber-700 active:scale-[0.98] transition-all duration-150
                           shadow-md shadow-amber-600/20 disabled:opacity-50 flex items-center
                           justify-center gap-2"
              >
                {submitting ? <Loader /> : "Change Password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}