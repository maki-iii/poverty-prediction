const STATUS_STYLES = {
  pending: "bg-yellow-100 text-yellow-800",
  processed: "bg-blue-100 text-blue-800",
  merged: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  seed: "bg-slate-100 text-slate-600",
  actual: "bg-slate-100 text-slate-600",
  FIES: "bg-purple-100 text-purple-700",
  APIS: "bg-cyan-100 text-cyan-700",
};

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || "bg-gray-100 text-gray-800";

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${style}`}>
      {status}
    </span>
  );
}