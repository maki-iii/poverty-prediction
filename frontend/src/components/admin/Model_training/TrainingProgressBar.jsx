export default function TrainingProgressBar({ status }) {
  if (!status || status.status === "idle") return null;

  const isFailed = status.status === "failed";
  const isCompleted = status.status === "completed";

  const barColor = isFailed ? "bg-red-500" : isCompleted ? "bg-emerald-500" : "bg-[#002366]";

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-700">
          {isFailed ? "Training Failed" : isCompleted ? "Training Complete" : "Training in Progress"}
        </p>
        <span className="text-xs font-medium text-slate-500">{status.progress ?? 0}%</span>
      </div>

      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-500 ease-out rounded-full`}
          style={{ width: `${status.progress ?? 0}%` }}
        />
      </div>

      <p className={`text-xs ${isFailed ? "text-red-600" : "text-slate-500"}`}>
        {status.message}
      </p>
    </div>
  );
}