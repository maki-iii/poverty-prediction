import { useEffect, useMemo, useState } from "react";
import {
  RefreshCw,
  AlertCircle,
  Search,
  MapPin,
  Calendar,
  Table,
  Database,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { getRegionalData } from "../../api/mlAPI";
import { Alert } from "../../components/common/Alert";
import Loader from "../../components/common/Loader";

const ITEMS_PER_PAGE = 5;

const COLUMN_LABELS = {
  region: "Region",
  year: "Year",
  poverty_incidence: "Poverty Incidence (%)",
  is_poor: "Poverty Status",
  household_id: "Household ID",
  family_size: "Family Size",
  total_household_income: "Total Household Income",
  total_expenditure: "Total Expenditure",
  food_expenditure: "Food Expenditure",
  nonfood_expenditure: "Non-food Expenditure",
  per_capita_income: "Per Capita Income",
  head_age: "Household Head Age",
  head_employed: "Head Employed",
  has_electricity: "Has Electricity",
  has_remittance: "Has Remittance",
  has_credit_access: "Has Credit Access",
  is_urban: "Urban Area",
};

function formatColumnLabel(column) {
  if (COLUMN_LABELS[column]) return COLUMN_LABELS[column];

  return column
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function isBinaryValue(value) {
  return value === 0 || value === 1 || value === "0" || value === "1";
}

function formatValue(value, column) {
  if (value === null || value === undefined || value === "") return "—";

  if (isBinaryValue(value)) {
    if (column === "is_poor") {
      return Number(value) === 1 ? "Poor" : "Not Poor";
    }

    return Number(value) === 1 ? "Yes" : "No";
  }

  const num = Number(value);

  if (!Number.isNaN(num) && value !== "") {
    return Number.isInteger(num) ? num : num.toFixed(4);
  }

  return value;
}

export default function RegionalData() {
  const [regionalData, setRegionalData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const loadRegionalData = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await getRegionalData();
      setRegionalData(res.data.regionalData || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to load regional processed data."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRegionalData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, regionFilter, yearFilter]);

  const columns = useMemo(() => {
    if (!regionalData.length) return [];

    return Object.keys(regionalData[0]);
  }, [regionalData]);

  const uniqueRegions = useMemo(() => {
    return [
      ...new Set(regionalData.map((item) => item.region).filter(Boolean)),
    ].sort();
  }, [regionalData]);

  const uniqueYears = useMemo(() => {
    return [
      ...new Set(regionalData.map((item) => item.year).filter(Boolean)),
    ].sort((a, b) => Number(b) - Number(a));
  }, [regionalData]);

  const filteredData = useMemo(() => {
    return regionalData.filter((item) => {
      const matchesSearch = Object.values(item)
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesRegion =
        regionFilter === "all" || item.region === regionFilter;

      const matchesYear =
        yearFilter === "all" || String(item.year) === String(yearFilter);

      return matchesSearch && matchesRegion && matchesYear;
    });
  }, [regionalData, search, regionFilter, yearFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredData.length / ITEMS_PER_PAGE)
  );

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (currentPage <= 3) return [1, 2, 3, 4, "...", totalPages];

    if (currentPage >= totalPages - 2) {
      return [
        1,
        "...",
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }

    return [
      1,
      "...",
      currentPage - 1,
      currentPage,
      currentPage + 1,
      "...",
      totalPages,
    ];
  }, [currentPage, totalPages]);

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Regional Data
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Processed regional poverty dataset used for training and analysis.
            </p>
          </div>

          <button
            onClick={loadRegionalData}
            disabled={loading}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-600 hover:bg-white disabled:opacity-50 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        {error && (
          <Alert type="error" message={error} onClose={() => setError("")} />
        )}

        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 flex items-center justify-center gap-2 text-slate-500">
            <Loader />
            <span className="text-xs">Loading regional data…</span>
          </div>
        ) : regionalData.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <AlertCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <h2 className="text-sm font-semibold text-slate-800">
              No regional data found
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Run preprocessing first to generate processed regional data.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Database className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">
                    Total Records
                  </p>
                  <p className="text-sm font-bold text-slate-900">
                    {regionalData.length}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-purple-500" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">
                    Regions
                  </p>
                  <p className="text-sm font-bold text-slate-900">
                    {uniqueRegions.length}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">
                    Years Covered
                  </p>
                  <p className="text-sm font-bold text-slate-900">
                    {uniqueYears.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search regional data..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:border-[#002366] focus:ring-2 focus:ring-[#002366]/10 outline-none"
                />
              </div>

              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:border-[#002366] focus:ring-2 focus:ring-[#002366]/10 outline-none"
              >
                <option value="all">All Regions</option>
                {uniqueRegions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>

              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:border-[#002366] focus:ring-2 focus:ring-[#002366]/10 outline-none"
              >
                <option value="all">All Years</option>
                {uniqueYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Table className="h-4 w-4 text-[#002366]" />
                  <div>
                    <h2 className="text-sm font-semibold text-slate-800">
                      Processed Regional Dataset
                    </h2>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {filteredData.length} record(s) found
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
                    <tr>
                      {columns.map((column) => (
                        <th
                          key={column}
                          title={column}
                          className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"
                        >
                          {formatColumnLabel(column)}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {paginatedData.length === 0 ? (
                      <tr>
                        <td
                          colSpan={columns.length}
                          className="px-4 py-6 text-center text-xs text-slate-400"
                        >
                          No records match your filters.
                        </td>
                      </tr>
                    ) : (
                      paginatedData.map((row, index) => (
                        <tr
                          key={index}
                          className="hover:bg-slate-50/60 transition-colors"
                        >
                          {columns.map((column) => (
                            <td
                              key={column}
                              className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap"
                            >
                              {column === "region" ? (
                                <span className="inline-flex items-center gap-1 font-medium text-slate-800">
                                  <MapPin className="h-3 w-3 text-[#002366]" />
                                  {formatValue(row[column], column)}
                                </span>
                              ) : column === "year" ? (
                                <span className="inline-flex items-center gap-1">
                                  <Calendar className="h-3 w-3 text-slate-400" />
                                  {formatValue(row[column], column)}
                                </span>
                              ) : (
                                formatValue(row[column], column)
                              )}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
                  <p className="text-[10px] text-slate-400">
                    Showing{" "}
                    <span className="font-medium text-slate-600">
                      {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
                      {Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium text-slate-600">
                      {filteredData.length}
                    </span>{" "}
                    records
                  </p>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        setCurrentPage((page) => Math.max(1, page - 1))
                      }
                      disabled={currentPage === 1}
                      className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>

                    {pageNumbers.map((page, index) =>
                      page === "..." ? (
                        <span
                          key={`ellipsis-${index}`}
                          className="w-7 h-7 flex items-center justify-center text-[11px] text-slate-400"
                        >
                          …
                        </span>
                      ) : (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-7 h-7 rounded-lg text-[11px] font-medium transition-colors ${
                            currentPage === page
                              ? "bg-[#002366] text-white border border-[#002366]"
                              : "border border-slate-200 text-slate-500 hover:bg-slate-50"
                          }`}
                        >
                          {page}
                        </button>
                      )
                    )}

                    <button
                      onClick={() =>
                        setCurrentPage((page) =>
                          Math.min(totalPages, page + 1)
                        )
                      }
                      disabled={currentPage === totalPages}
                      className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}