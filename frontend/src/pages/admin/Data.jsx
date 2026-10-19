import { formatNumber } from "../../utils/formatNumber.js";
import { useState, useMemo, useEffect } from "react";
import { Table2 } from "lucide-react";
import { useTimeline, usePipelineActions } from "../../hooks/usePoverty";

import SearchBar from "../../components/common/SearchBar";
import DateRangeFilter from "../../components/common/DateRangeFilter";
import Loader from "../../components/common/Loader";
import ConfirmModal from "../../components/common/ConfirmModal";
import DataTable from "../../components/admin/Data/DataTable";
import Pagination from "../../components/common/Pagination";
import usePagination from "../../hooks/usePagination";
import { useToast } from "../../context/ToastContext";

export default function Data() {
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [rowToDelete, setRowToDelete] = useState(null);
  const toast = useToast();

  const { data: timeline, loading, error, refetch } = useTimeline();
  const actuals = timeline?.actuals;
  const { deleteActual, running } = usePipelineActions();

  // --- Client-side filtering ---
  const filteredActuals = useMemo(() => {
    if (!actuals) return [];
    return actuals.filter((row) => {
      const matchesSearch =
        row.region.toLowerCase().includes(search.toLowerCase()) ||
        String(row.year).includes(search);

      const startYear = dateRange.startDate ? new Date(dateRange.startDate).getFullYear() : null;
      const endYear = dateRange.endDate ? new Date(dateRange.endDate).getFullYear() : null;

      const matchesStart = !startYear || row.year >= startYear;
      const matchesEnd = !endYear || row.year <= endYear;

      return matchesSearch && matchesStart && matchesEnd;
    });
  }, [actuals, search, dateRange]);

  // --- Pagination (depends on filteredActuals, so must come after it) ---
  const {
    paginatedItems: paginatedActuals,
    currentPage,
    totalItems,
    pageSize,
    goToPage,
    resetPage,
  } = usePagination(filteredActuals, 8);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    resetPage();
  }, [search, dateRange]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = (row) => {
    if (timeline?.data_history === "fies_only" && row.source?.toLowerCase() === "interpolated") {
      toast.info("This value is calculated from surrounding FIES observations and updates automatically when those observations change.");
      return;
    }
    setRowToDelete(row);
  };

  const handleConfirmDelete = async () => {
    if (!rowToDelete) return;
    try {
      await deleteActual(rowToDelete.year, rowToDelete.region);
      toast.success(`Deleted ${rowToDelete.region} ${rowToDelete.year} from actuals`);
      await refetch();
    } catch (err) {
      toast.error(err.message || "Failed to delete row");
    } finally {
      setRowToDelete(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#002366]/10">
          <Table2 className="w-5 h-5 text-[#002366]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#002366] tracking-tight">Data</h1>
          <p className="text-xs text-slate-500">All actuals used to train the ML model</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 bg-white border border-slate-200 rounded-xl p-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by region or year..." />
        <DateRangeFilter
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
          onChange={setDateRange}
        />
      </div>

      {/* Table */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Actuals</h2>
          <span className="text-xs text-slate-400">({filteredActuals.length})</span>
        </div>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader />
          </div>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <>
            <DataTable actuals={paginatedActuals} onDelete={handleDelete} />
            <Pagination
              currentPage={currentPage}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={goToPage}
            />
          </>
        )}
      </section>

      {/* Confirm delete modal */}
      {rowToDelete && (
        <ConfirmModal
          isOpen={!!rowToDelete}
          onConfirm={handleConfirmDelete}
          onCancel={() => setRowToDelete(null)}
          title="Delete Data Row?"
          subtitle="This action cannot be undone."
          warning="This row will be removed from training data. You'll need to re-run the ML pipeline afterward."
          confirmLabel={running ? "Deleting..." : "Delete"}
          cancelLabel="Cancel"
          fields={[
            { key: "region", label: "Region", value: rowToDelete.region },
            { key: "year", label: "Year", value: rowToDelete.year },
            { key: "poverty", label: "Poverty Incidence", value: `${formatNumber(rowToDelete.poverty_incidence)}%` },
          ]}
        />
      )}
    </div>
  );
}
