import { CheckCircle2, XCircle } from "lucide-react";
import Loader from "../../common/Loader";

const STEP_LABELS = {
  loading_dataset: "Loading Dataset...",
  preprocessing: "Preprocessing...",
  splitting: "Splitting Dataset...",
  training: "Training Model(s)...",
  saving: "Saving Model...",
  evaluating: "Evaluating Models...",
  predicting: "Generating Predictions...",
  finalizing: "Training Complete.",
};

export default function TrainingStepsList({ status }) {
  if (!status || status.status === "idle") return null;

  const isFailed = status.status === "failed";
  const isCompleted = status.status === "completed";

  // Prefer the backend's own message (it's more specific, e.g. names the
  // exact model being trained) and fall back to the generic step label.
  const label = status.message || STEP_LABELS[status.step] || "Working...";

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-3.5">
      <div className="flex items-center gap-2.5">
        {isFailed ? (
          <XCircle className="w-4 h-4 text-red-500 shrink-0" />
        ) : isCompleted ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
        ) : (
          <div className="w-4 h-4 shrink-0 flex items-center justify-center scale-75">
            <Loader />
          </div>
        )}
        <p
          key={status.step} // re-mounts on step change, so the fade-in below replays each time
          className={`text-xs animate-[fadeIn_0.3s_ease-in] ${
            isFailed ? "text-red-600 font-medium" : isCompleted ? "text-emerald-600 font-semibold" : "text-slate-800 font-semibold"
          }`}
        >
          {label}
        </p>
      </div>

      {/* Progress bar underneath, for context */}
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-3">
        <div
          className={`h-full transition-all duration-500 ease-out rounded-full ${
            isFailed ? "bg-red-500" : isCompleted ? "bg-emerald-500" : "bg-[#002366]"
          }`}
          style={{ width: `${status.progress ?? 0}%` }}
        />
      </div>
    </div>
  );
}