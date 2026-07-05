import { useEffect, useMemo, useState } from "react";
import {
  MapPin,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Search,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { getPredictions } from "../../api/mlAPI";
import { Alert } from "../../components/common/Alert";
import Loader from "../../components/common/Loader";
import PredictionResultsTable from "../../components/admin/regional_analysis/PredictionResultsTable";

const ITEMS_PER_PAGE = 5;

export default function RegionalAnalysis() {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("highest");
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [error, setError] = useState("");
  const [showTable, setShowTable] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const loadResults = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getPredictions();
      setPredictions(res.data.predictions || []);
    } catch {
      setError("Failed to load regional prediction results.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadResults(); }, []);

  // Reset to page 1 whenever filters change
  useEffect(() => { setCurrentPage(1); }, [search, selectedRegion, sortBy]);

  const formatNumber = (value, digits = 2) => {
    if (value === null || value === undefined || value === "") return "N/A";
    const num = Number(value);
    if (Number.isNaN(num)) return value;
    return num.toFixed(digits);
  };

  const getPredictionValue = (item) =>
    Number(
      item.predicted_poverty_incidence ||
        item.regression_predicted_poverty_incidence ||
        item.poverty_incidence ||
        0
    );

  const uniqueRegions = useMemo(() => {
    const regionSet = new Set();
    predictions.forEach((item) => { if (item.region) regionSet.add(item.region); });
    return Array.from(regionSet).sort();
  }, [predictions]);

  const filteredPredictions = useMemo(() => {
    let result = [...predictions].filter((item) => {
      const matchesSearch = item.region?.toLowerCase().includes(search.toLowerCase());
      const matchesRegion = selectedRegion === "all" || item.region === selectedRegion;
      return matchesSearch && matchesRegion;
    });

    result.sort((a, b) => {
      const valueA = getPredictionValue(a);
      const valueB = getPredictionValue(b);
      if (sortBy === "lowest") return valueA - valueB;
      if (sortBy === "region") return a.region.localeCompare(b.region);
      return valueB - valueA;
    });

    return result;
  }, [predictions, search, selectedRegion, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredPredictions.length / ITEMS_PER_PAGE));

  const paginatedPredictions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPredictions.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPredictions, currentPage]);

  const summaryStats = useMemo(() => {
    const values = predictions
      .map((item) => getPredictionValue(item))
      .filter((v) => !Number.isNaN(v));

    if (!values.length) return {
      highestRegion: "N/A", highestValue: "N/A",
      lowestRegion: "N/A", lowestValue: "N/A",
      averageValue: "N/A",
    };

    const highestItem = predictions.reduce((max, item) =>
      getPredictionValue(item) > getPredictionValue(max) ? item : max
    );
    const lowestItem = predictions.reduce((min, item) =>
      getPredictionValue(item) < getPredictionValue(min) ? item : min
    );
    const average = values.reduce((t, v) => t + v, 0) / values.length;

    return {
      highestRegion: highestItem.region,
      highestValue: formatNumber(getPredictionValue(highestItem)),
      lowestRegion: lowestItem.region,
      lowestValue: formatNumber(getPredictionValue(lowestItem)),
      averageValue: formatNumber(average),
    };
  }, [predictions]);

  const maxPredictionValue = useMemo(() => {
    const values = filteredPredictions.map((item) => getPredictionValue(item));
    return values.length ? Math.max(...values) : 0;
  }, [filteredPredictions]);

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto p-4 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Regional Analysis</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Predicted poverty incidence per region and comparative risk levels.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {predictions.length > 0 && (
              <button
                onClick={() => setShowTable(true)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-600 hover:bg-white flex items-center gap-1.5 transition-colors"
              >
                <FileText className="h-3.5 w-3.5" />
                View Table
              </button>
            )}
            <button
              onClick={loadResults}
              disabled={loading}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-600 hover:bg-white disabled:opacity-50 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError("")} />}

        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 flex items-center justify-center gap-2 text-slate-500">
            <Loader />
            <span className="text-xs">Loading regional analysis…</span>
          </div>
        ) : predictions.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <AlertCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <h2 className="text-sm font-semibold text-slate-800">No prediction results found</h2>
            <p className="text-xs text-slate-500 mt-1">
              Train the model first to generate regional prediction results.
            </p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                {
                  label: "Highest Predicted Poverty",
                  region: summaryStats.highestRegion,
                  value: `${summaryStats.highestValue}%`,
                  valueColor: "text-red-600",
                  icon: TrendingUp,
                  iconBg: "bg-red-50",
                  iconColor: "text-red-500",
                },
                {
                  label: "Lowest Predicted Poverty",
                  region: summaryStats.lowestRegion,
                  value: `${summaryStats.lowestValue}%`,
                  valueColor: "text-emerald-600",
                  icon: TrendingDown,
                  iconBg: "bg-emerald-50",
                  iconColor: "text-emerald-500",
                },
                {
                  label: "Average Predicted Poverty",
                  region: `Across ${predictions.length} region(s)`,
                  value: `${summaryStats.averageValue}%`,
                  valueColor: "text-blue-600",
                  icon: BarChart3,
                  iconBg: "bg-blue-50",
                  iconColor: "text-blue-500",
                },
              ].map(({ label, region, value, valueColor, icon: Icon, iconBg, iconColor }) => (
                <div key={label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-3.5 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
                    <Icon className={`h-4 w-4 ${iconColor}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide">{label}</p>
                    <p className="text-sm font-bold text-slate-900 truncate">{region}</p>
                    <p className={`text-xs font-semibold ${valueColor}`}>{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Filters + Region Cards */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search region..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:border-[#002366] focus:ring-2 focus:ring-[#002366]/10 outline-none"
                  />
                </div>

                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:border-[#002366] focus:ring-2 focus:ring-[#002366]/10 outline-none"
                >
                  <option value="all">All Regions</option>
                  {uniqueRegions.map((region) => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:border-[#002366] focus:ring-2 focus:ring-[#002366]/10 outline-none"
                >
                  <option value="highest">Highest First</option>
                  <option value="lowest">Lowest First</option>
                  <option value="region">Region Name</option>
                </select>
              </div>

              {/* Region Cards */}
              <div className="space-y-2">
                {paginatedPredictions.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No regions match your search.
                  </div>
                ) : (
                  paginatedPredictions.map((item) => {
                    const value = getPredictionValue(item);
                    const width = Math.min(100, value);

                    return (
                      <div
                        key={`${item.region}-${item.prediction_year}`}
                        className="rounded-lg border border-slate-100 p-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-[#002366] shrink-0" />
                            <div>
                              <p className="text-xs font-semibold text-slate-900">{item.region}</p>
                              <p className="text-[10px] text-slate-400">
                                Year: {item.prediction_year || item.year || "N/A"}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-slate-900">{formatNumber(value)}%</p>
                            <p className="text-[10px] text-slate-400">Poverty Incidence</p>
                          </div>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#002366] rounded-full transition-all"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <p className="text-[10px] text-slate-400">
                    Showing{" "}
                    <span className="font-medium text-slate-600">
                      {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
                      {Math.min(currentPage * ITEMS_PER_PAGE, filteredPredictions.length)}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium text-slate-600">{filteredPredictions.length}</span>{" "}
                    regions
                  </p>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-7 h-7 rounded-lg text-[11px] font-medium transition-colors
                          ${currentPage === page
                            ? "bg-[#002366] text-white border border-[#002366]"
                            : "border border-slate-200 text-slate-500 hover:bg-slate-50"
                          }`}
                      >
                        {page}
                      </button>
                    ))}

                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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

      {showTable && (
        <PredictionResultsTable
          predictions={filteredPredictions}
          onClose={() => setShowTable(false)}
        />
      )}
    </div>
  );
}