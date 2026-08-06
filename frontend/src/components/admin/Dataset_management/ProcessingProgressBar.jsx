import { CheckCircle2, XCircle } from "lucide-react";
import Loader from "../../common/Loader";

const STEP_LABELS = {
  reading_file: "Reading File...",
  resolving_columns: "Resolving Columns...",
  filtering_region: "Filtering Region...",
  computing_income: "Computing Income & Expenditure...",
  computing_employment: "Computing Employment Rate...",
  computing_education: "Computing Educational Attainment...",
  finalizing: "Finalizing...",
  done: "Processing Complete.",
};

export default function ProcessingProgressBar({ status }) {
  if (!status || status.status === "idle") return null;

  const isFailed = status.status === "failed";
  const isCompleted = status.status === "completed";
  const label = status.message || STEP_LABELS[status.step] || "Processing...";

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-3">
      <div className="flex items-center gap-2 mb-1.5">
        {isFailed ? (
          <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
        ) : isCompleted ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
        ) : (
          <div className="w-3.5 h-3.5 shrink-0 flex items-center justify-center scale-75">
            <Loader />
          </div>
        )}
        <p
          key={status.step}
          className={`text-[11px] font-semibold ${
            isFailed ? "text-red-600" : isCompleted ? "text-emerald-600" : "text-slate-700"
          }`}
        >
          {label}
        </p>
        <span className="text-[11px] font-medium text-slate-400 ml-auto">{status.progress ?? 0}%</span>
      </div>
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ease-out rounded-full ${
            isFailed ? "bg-red-500" : isCompleted ? "bg-emerald-500" : "bg-[#002366]"
          }`}
          style={{ width: `${status.progress ?? 0}%` }}
        />
      </div>
    </div>
  );
}