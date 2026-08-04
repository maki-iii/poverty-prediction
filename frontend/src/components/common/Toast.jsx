import { useEffect } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

const TOAST_STYLES = {
  success: {
    bg: "bg-white",
    border: "border-emerald-200",
    icon: CheckCircle2,
    iconColor: "text-emerald-500",
    barColor: "bg-emerald-500",
  },
  error: {
    bg: "bg-white",
    border: "border-red-200",
    icon: XCircle,
    iconColor: "text-red-500",
    barColor: "bg-red-500",
  },
  info: {
    bg: "bg-white",
    border: "border-[#002366]/20",
    icon: Info,
    iconColor: "text-[#002366]",
    barColor: "bg-[#002366]",
  },
};

export default function Toast({ id, message, type = "info", duration = 4000, onDismiss }) {
  const style = TOAST_STYLES[type] || TOAST_STYLES.info;
  const Icon = style.icon;

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), duration);
    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  return (
    <div
      className={`relative w-80 ${style.bg} border ${style.border} rounded-xl shadow-lg overflow-hidden
                  animate-[slideIn_0.25s_ease-out]`}
    >
      <div className={`h-1 w-full ${style.barColor}`} />
      <div className="p-3.5 flex items-start gap-2.5">
        <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${style.iconColor}`} />
        <p className="text-xs text-slate-700 leading-snug flex-1">{message}</p>
        <button
          onClick={() => onDismiss(id)}
          className="text-slate-300 hover:text-slate-500 transition shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}