import ActionBadge from "./ActionBadge";

export default function AuditLogTable({ logs }) {
  if (!logs || logs.length === 0) {
    return (
      <div className="text-center text-xs text-slate-400 py-6 border border-dashed border-slate-200 rounded-xl">
        No audit logs yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-xl">
      <table className="min-w-full divide-y divide-slate-100 text-xs">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">
              ID
            </th>
            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">
              User
            </th>
            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">
              Action
            </th>
            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">
              Details
            </th>
            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">
              Date & Time
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {logs.map((log) => (
            <tr key={log.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-3 py-2 text-slate-500">{log.id}</td>
              <td className="px-3 py-2 text-slate-700 font-medium">
                {log.username || "Unknown"}
              </td>
              <td className="px-3 py-2">
                <ActionBadge action={log.action} />
              </td>
              <td className="px-3 py-2 text-slate-500 max-w-xs truncate" title={log.details}>
                {log.details || "—"}
              </td>
              <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                {new Date(log.created_at).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}