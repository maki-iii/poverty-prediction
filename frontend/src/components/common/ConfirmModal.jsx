import { X, CheckCircle2, AlertTriangle, FileText, LogOut } from "lucide-react";

const DEFAULT_WARNING =
  "Make sure your details are correct before continuing. Some fields may not be editable later.";

function maskValue(value = "") {
  return "•".repeat(Math.min(value.length, 10));
}

export default function ConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
  title = "Confirm your details",
  subtitle = "Please review before continuing",
  warning = DEFAULT_WARNING,
  confirmLabel = "Confirm",
  cancelLabel = "Go Back & Edit",
  fields = [],
}) {
  if (!isOpen) return null;

  const visibleRows = fields.filter(
    ({ value, hide }) =>
      !hide && value !== undefined && value !== null && String(value).trim() !== ""
  );

  const isExitGuard = visibleRows.length === 0;
  const HeaderIcon = isExitGuard ? LogOut : CheckCircle2;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top accent bar */}
        <div className="h-1 w-full bg-[#002366]" />

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0 bg-[#002366]/10">
                <HeaderIcon className="h-5 w-5 text-[#002366]" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#002366] tracking-tight leading-tight">
                  {title}
                </h2>
                {subtitle && (
                  <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>
                )}
              </div>
            </div>
            <button
              onClick={onCancel}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Field rows — only shown when there are visible fields */}
          {visibleRows.length > 0 && (
            <div className="rounded-xl border border-slate-200 overflow-hidden mb-4">
              {visibleRows.map(({ key, label, value, icon: Icon, mask }, idx) => (
                <div
                  key={key}
                  className={`flex items-center gap-3 px-4 py-3 bg-slate-50 ${
                    idx !== visibleRows.length - 1 ? "border-b border-slate-100" : ""
                  }`}
                >
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#002366]/10 shrink-0">
                    {Icon
                      ? <Icon className="h-3.5 w-3.5 text-[#002366]" />
                      : <FileText className="h-3.5 w-3.5 text-[#002366]" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider leading-none mb-0.5">
                      {label}
                    </p>
                    <p className="text-sm text-slate-800 font-medium truncate">
                      {mask ? maskValue(String(value)) : String(value)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Warning note */}
          {warning && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 mb-5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-700 leading-snug">{warning}</p>
            </div>
          )}

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onCancel}
              className="h-11 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] transition-all duration-150"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              className="h-11 rounded-xl bg-[#002366] text-white text-sm font-semibold hover:bg-[#001a4d] active:scale-[0.98] transition-all duration-150 shadow-md shadow-[#002366]/20"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}