import { useState, useMemo } from "react";
import { ClipboardList } from "lucide-react";
import useAuditLogs from "../../hooks/useAuditLogs";

import Loader from "../../components/common/Loader";
import SearchBar from "../../components/common/SearchBar";
import DateRangeFilter from "../../components/common/DateRangeFilter";
import Pagination from "../../components/common/Pagination";
import AuditLogTable from "../../components/admin/Audit_logs/AuditLogTable";

export default function AuditLogs() {
  const { logs, total, page, setPage, pageSize, loading, error } = useAuditLogs(10);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });

  const filteredLogs = useMemo(() => {
    let result = logs;

    if (search) {
      const term = search.toLowerCase();
      result = result.filter(
        (log) =>
          log.username?.toLowerCase().includes(term) ||
          log.action?.toLowerCase().includes(term) ||
          log.details?.toLowerCase().includes(term)
      );
    }

    if (dateRange.startDate || dateRange.endDate) {
      result = result.filter((log) => {
        const logDate = new Date(log.created_at);
        const matchesStart = !dateRange.startDate || logDate >= new Date(dateRange.startDate);
        const matchesEnd = !dateRange.endDate || logDate <= new Date(dateRange.endDate + "T23:59:59");
        return matchesStart && matchesEnd;
      });
    }

    return result;
  }, [logs, search, dateRange]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-[#002366] to-[#003a99] shadow-md shadow-[#002366]/20">
          <ClipboardList className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-[#002366] tracking-tight">Audit Logs</h1>
          <p className="text-[11px] text-slate-500">
            Full history of training, dataset, and user management actions
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-end gap-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by user, action, or details..." />
        <DateRangeFilter
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
          onChange={setDateRange}
        />
      </div>

      {/* Table */}
      <section>
        <div className="flex items-center gap-2 mb-2.5">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Logs</h2>
          <span className="text-xs text-slate-400">({total} total)</span>
        </div>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader />
          </div>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <>
            <AuditLogTable logs={filteredLogs} />
            <Pagination
              currentPage={page}
              totalItems={total}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </>
        )}
      </section>
    </div>
  );
}