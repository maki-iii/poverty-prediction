import { X, CheckCircle, AlertTriangle, Info, XCircle } from "lucide-react";

const variants = {
  success: {
    container: "bg-green-50 border border-green-200 text-green-800",
    icon: "text-green-500",
    close: "text-green-400 hover:text-green-600",
    Icon: CheckCircle,
  },
  warning: {
    container: "bg-yellow-50 border border-yellow-200 text-yellow-800",
    icon: "text-yellow-500",
    close: "text-yellow-400 hover:text-yellow-600",
    Icon: AlertTriangle,
  },
  error: {
    container: "bg-red-50 border border-red-200 text-red-800",
    icon: "text-red-500",
    close: "text-red-400 hover:text-red-600",
    Icon: XCircle,
  },
  info: {
    container: "bg-blue-50 border border-blue-200 text-blue-800",
    icon: "text-blue-500",
    close: "text-blue-400 hover:text-blue-600",
    Icon: Info,
  },
};

// ─── Base Alert ───────────────────────────────────────────
export function Alert({ type = "info", title, message, onClose, className = "" }) {
  const v = variants[type] ?? variants.info;
  const { Icon } = v;

  return (
    <div className={`flex items-start gap-3 rounded-xl px-4 py-3 text-sm ${v.container} ${className}`}>
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${v.icon}`} />
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold leading-snug">{title}</p>}
        {message && <p className="mt-0.5 leading-snug opacity-90">{message}</p>}
      </div>
      {onClose && (
        <button onClick={onClose} className={`mt-0.5 shrink-0 transition ${v.close}`}>
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// ─── Named shortcuts ──────────────────────────────────────
export const SuccessAlert = (props) => <Alert type="success" {...props} />;
export const WarningAlert = (props) => <Alert type="warning" {...props} />;
export const ErrorAlert   = (props) => <Alert type="error"   {...props} />;
export const InfoAlert    = (props) => <Alert type="info"    {...props} />;