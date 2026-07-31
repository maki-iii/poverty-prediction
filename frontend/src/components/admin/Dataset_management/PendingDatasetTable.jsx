import StatusBadge from "./StatusBadge";

export default function PendingDatasetsTable({ datasets, onProcess, onDelete }) {
  if (!datasets || datasets.length === 0) {
    return (
      <div className="text-center text-xs text-slate-400 py-6 border border-dashed border-slate-200 rounded-xl">
        No pending datasets.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-xl">
      <table className="min-w-full divide-y divide-slate-100 text-xs">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">
              Filename
            </th>
            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">
              Uploaded By
            </th>
            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">
              Uploaded At
            </th>
            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {datasets.map((d) => (
            <tr key={d.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-3 py-2 text-slate-700 max-w-[180px] truncate">
                {d.original_filename}
              </td>
              <td className="px-3 py-2 text-slate-500">{d.uploaded_by || "—"}</td>
              <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                {d.uploaded_at ? new Date(d.uploaded_at).toLocaleString() : "—"}
              </td>
              <td className="px-3 py-2">
                <StatusBadge status={d.status} />
                {d.status === "failed" && d.error_message && (
                  <p className="text-[10px] text-red-500 mt-0.5 max-w-[160px] truncate" title={d.error_message}>
                    {d.error_message}
                  </p>
                )}
              </td>
              <td className="px-3 py-2 text-right whitespace-nowrap space-x-1.5">
                <button
                  onClick={() => onProcess(d)}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-[#002366] text-white
                             hover:bg-[#001a4d] active:scale-[0.97] transition-all duration-150"
                >
                  Process
                </button>
                <button
                  onClick={() => onDelete(d.id)}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-red-50 text-red-600
                             hover:bg-red-100 active:scale-[0.97] transition-all duration-150"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}