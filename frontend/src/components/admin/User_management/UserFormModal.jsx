import { useState, useEffect } from "react";
import { X, UserPlus, UserCog } from "lucide-react";
import Loader from "../../common/Loader";

const inputClass =
  "w-full px-3 h-10 border border-slate-200 rounded-xl text-sm text-slate-800 " +
  "focus:outline-none focus:ring-2 focus:ring-[#002366]/30 focus:border-[#002366] transition";
const labelClass = "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5";

export default function UserFormModal({ mode, user, onClose, onSubmit, submitting }) {
  const isEdit = mode === "edit";

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [role, setRole] = useState("user");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isEdit && user) {
      setName(user.name || "");
      setUsername(user.username || "");
      setEmail(user.email || "");
      setAddress(user.address || "");
      setRole(user.role || "user");
    }
  }, [isEdit, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (isEdit) {
      if (!name || !address || !email) {
        setError("Name, address, and email are required.");
        return;
      }
    } else {
      if (!name || !username || !password || !email || !address) {
        setError("All fields are required.");
        return;
      }
    }

    try {
      if (isEdit) {
        await onSubmit(user.id, { name, address, email });
      } else {
        await onSubmit({ name, username, password, email, address, role });
      }
      onClose();
    } catch (err) {
      setError(err.message || "Something went wrong");
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 w-full bg-gradient-to-r from-[#002366] to-[#0044cc]" />

        <div className="p-6">
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0 bg-[#002366]/10">
                {isEdit ? (
                  <UserCog className="h-5 w-5 text-[#002366]" />
                ) : (
                  <UserPlus className="h-5 w-5 text-[#002366]" />
                )}
              </div>
              <h2 className="text-base font-bold text-[#002366] tracking-tight">
                {isEdit ? "Edit User" : "Create User"}
              </h2>
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
              <label className={labelClass}>Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
            </div>

            {!isEdit && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Username</label>
                  <input value={username} onChange={(e) => setUsername(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Role</label>
                  <select value={role} onChange={(e) => setRole(e.target.value)} className={inputClass}>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className={labelClass}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Address</label>
              <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
            </div>

            {!isEdit && (
              <div>
                <label className={labelClass}>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Min 8 characters, with uppercase, lowercase, and a special character.
                </p>
              </div>
            )}

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
                className="h-11 rounded-xl bg-[#002366] text-white text-sm font-semibold
                           hover:bg-[#001a4d] active:scale-[0.98] transition-all duration-150
                           shadow-md shadow-[#002366]/20 disabled:opacity-50 flex items-center
                           justify-center gap-2"
              >
                {submitting ? <Loader /> : isEdit ? "Save Changes" : "Create User"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}