const ACTION_STYLES = {
  training: "bg-blue-50 text-blue-700",
  forecast: "bg-indigo-50 text-indigo-700",
  predict: "bg-purple-50 text-purple-700",
  run_full_pipeline: "bg-violet-50 text-violet-700",

  upload: "bg-cyan-50 text-cyan-700",
  process: "bg-teal-50 text-teal-700",
  merge: "bg-emerald-50 text-emerald-700",
  dataset_deletion: "bg-red-50 text-red-700",

  actuals_deletion: "bg-red-50 text-red-700",
  actuals_merge: "bg-emerald-50 text-emerald-700",

  user_creation: "bg-green-50 text-green-700",
  user_deletion: "bg-red-50 text-red-700",
  user_change_password: "bg-amber-50 text-amber-700",
  user_update: "bg-sky-50 text-sky-700",
};

const ACTION_LABELS = {
  training: "Training",
  forecast: "Forecast",
  predict: "Predict",
  run_full_pipeline: "Full Pipeline",

  upload: "Upload",
  process: "Process",
  merge: "Merge",
  dataset_deletion: "Dataset Deleted",

  actuals_deletion: "Actuals Deleted",
  actuals_merge: "Actuals Merged",

  user_creation: "User Created",
  user_deletion: "User Deleted",
  user_change_password: "Password Changed",
  user_update: "User Updated",
};

export default function ActionBadge({ action }) {
  const style = ACTION_STYLES[action] || "bg-slate-100 text-slate-600";
  const label = ACTION_LABELS[action] || action;

  return (
    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${style}`}>
      {label}
    </span>
  );
}