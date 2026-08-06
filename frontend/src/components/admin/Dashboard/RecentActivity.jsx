import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import AuditLogService from "../../../services/auditLogService";
import ActionBadge from "../Audit_logs/ActionBadge";
import Loader from "../../common/Loader";

export default function RecentActivity({ limit = 5 }) {
  const [logs, setLogs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    AuditLogService.getLogs(1, limit)
      .then((result) => {
        if (!cancelled) setLogs(result.logs);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [limit]);

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-2.5 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-3.5 h-3.5 text-slate-400" />
        <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
          Recent Activity
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center flex-1 py-6">
          <Loader />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center flex-1">
          <p className="text-xs text-red-500 text-center">{error}</p>
        </div>
      ) : !logs || logs.length === 0 ? (
        <div className="flex items-center justify-center flex-1">
          <p className="text-xs text-slate-400 text-center">
            No recent activity.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 flex-1 overflow-y-auto">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-50 last:border-0"
            >
              <div className="flex items-center gap-2 min-w-0">
                <ActionBadge action={log.action} />
                <p className="text-[11px] text-slate-600 truncate">
                  <span className="font-medium text-slate-700">
                    {log.username || "Unknown"}
                  </span>
                  {log.details ? ` — ${log.details}` : ""}
                </p>
              </div>

              <span className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap">
                {new Date(log.created_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}