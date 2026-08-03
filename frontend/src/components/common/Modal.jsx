import { X } from "lucide-react";

export default function Modal({ isOpen, onClose, title, subtitle, children, maxWidth = "max-w-4xl" }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        className={`relative w-full ${maxWidth} bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 w-full bg-gradient-to-r from-[#002366] to-[#0044cc] shrink-0" />

        <div className="p-5 flex items-start justify-between shrink-0 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-[#002366] tracking-tight">{title}</h2>
            {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}