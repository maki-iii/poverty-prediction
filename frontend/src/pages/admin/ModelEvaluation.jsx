import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Trophy,
  RefreshCw,
  AlertCircle,
  Activity,
  TrendingDown,
  Target,
  Percent,
  TableProperties,
} from "lucide-react";

import { getMetrics } from "../../api/mlAPI";
import { Alert } from "../../components/common/Alert";
import Loader from "../../components/common/Loader";
import EvaluationTable from "../../components/admin/model_evaluation/EvaluationTable";

export default function ModelEvaluation() {
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showTable, setShowTable] = useState(false);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getMetrics();
      setMetrics(res.data.metrics || []);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load model evaluation metrics."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMetrics(); }, []);

  const bestModel = useMemo(
    () => metrics.find((item) => Number(item.is_best) === 1) || null,
    [metrics]
  );

  const sortedMetrics = useMemo(() => {
    return [...metrics].sort((a, b) => {
      const bestA = Number(a.is_best) === 1 ? -1 : 0;
      const bestB = Number(b.is_best) === 1 ? -1 : 0;
      if (bestA !== bestB) return bestA - bestB;
      return Number(a.test_mae || 999999) - Number(b.test_mae || 999999);
    });
  }, [metrics]);

  const chartData = useMemo(() => {
    return sortedMetrics.map((item) => ({
      model: item.model_name || item.model || "Model",
      mae: Number(item.test_mae || 0),
      rmse: Number(item.test_rmse || 0),
      r2: Number(item.test_r2 || 0),
      mape: Number(item.test_mape || 0),
    }));
  }, [sortedMetrics]);

  const formatNumber = (value, digits = 4) => {
    if (value === null || value === undefined || value === "") return "N/A";
    const num = Number(value);
    if (Number.isNaN(num)) return value;
    return num.toFixed(digits);
  };

  const getMetricStatus = (metric, value) => {
    const num = Number(value);
    if (Number.isNaN(num)) return "N/A";
    if (metric === "r2") {
      if (num >= 0.9) return "Excellent";
      if (num >= 0.8) return "Good";
      if (num >= 0.6) return "Fair";
      return "Poor";
    }
    if (metric === "mape") {
      if (num <= 10) return "Excellent";
      if (num <= 20) return "Good";
      if (num <= 30) return "Fair";
      return "Poor";
    }
    return "Lower is better";
  };

  const getStatusColor = (metric, value) => {
    const status = getMetricStatus(metric, value);
    if (status === "Excellent") return "text-emerald-600";
    if (status === "Good") return "text-blue-600";
    if (status === "Fair") return "text-amber-600";
    if (status === "Poor") return "text-red-500";
    return "text-slate-500";
  };

  const getBestValue = (key, mode = "min") => {
    if (!metrics.length) return "N/A";
    const values = metrics
      .map((item) => Number(item[key]))
      .filter((value) => !Number.isNaN(value));
    if (!values.length) return "N/A";
    const result = mode === "max" ? Math.max(...values) : Math.min(...values);
    return formatNumber(result);
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto p-4 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Model Evaluation</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Ridge Regression · Random Forest · XGBoost
            </p>
          </div>
          <div className="flex items-center gap-2">
            {metrics.length > 0 && (
              <button
                onClick={() => setShowTable(true)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-600 hover:bg-white flex items-center gap-1.5 transition-colors"
              >
                <TableProperties className="h-3.5 w-3.5" />
                View Table
              </button>
            )}
            <button
              onClick={loadMetrics}
              disabled={loading}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-600 hover:bg-white disabled:opacity-50 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {message && <Alert type="success" message={message} onClose={() => setMessage("")} />}
        {error && <Alert type="error" message={error} onClose={() => setError("")} />}

        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 flex items-center justify-center gap-2 text-slate-500">
            <Loader />
            <span className="text-xs">Loading metrics…</span>
          </div>
        ) : metrics.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <AlertCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <h2 className="text-sm font-semibold text-slate-800">No metrics found</h2>
            <p className="text-xs text-slate-500 mt-1">
              Train the models first to generate evaluation metrics.
            </p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              {[
                {
                  label: "Best Model",
                  value: bestModel?.model_name || bestModel?.model || "N/A",
                  icon: Trophy,
                  iconBg: "bg-amber-50",
                  iconColor: "text-amber-500",
                },
                {
                  label: "Lowest MAE",
                  value: getBestValue("test_mae"),
                  icon: TrendingDown,
                  iconBg: "bg-blue-50",
                  iconColor: "text-blue-500",
                },
                {
                  label: "Lowest RMSE",
                  value: getBestValue("test_rmse"),
                  icon: Target,
                  iconBg: "bg-purple-50",
                  iconColor: "text-purple-500",
                },
                {
                  label: "Highest R²",
                  value: getBestValue("test_r2", "max"),
                  icon: Activity,
                  iconBg: "bg-emerald-50",
                  iconColor: "text-emerald-500",
                },
              ].map(({ label, value, icon: Icon, iconBg, iconColor }) => (
                <div
                  key={label}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm p-3.5 flex items-center gap-3"
                >
                  <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
                    <Icon className={`h-4 w-4 ${iconColor}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide">{label}</p>
                    <p className="text-sm font-bold text-slate-900 truncate">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {/* MAE / RMSE Bar Chart */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5 mb-3">
                  <BarChart3 className="h-4 w-4 text-[#002366]" />
                  MAE & RMSE Comparison
                </h2>
                <div className="space-y-3">
                  {chartData.map((item) => {
                    const maxError = Math.max(
                      ...chartData.map((row) => Math.max(row.mae || 0, row.rmse || 0))
                    );
                    const maeWidth = maxError ? Math.min(100, (item.mae / maxError) * 100) : 0;
                    const rmseWidth = maxError ? Math.min(100, (item.rmse / maxError) * 100) : 0;

                    return (
                      <div key={item.model}>
                        <p className="text-xs font-semibold text-slate-700 mb-1.5">{item.model}</p>
                        <div className="space-y-1.5">
                          <div>
                            <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                              <span>MAE</span>
                              <span className="font-medium text-slate-600">{formatNumber(item.mae)}</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full transition-all"
                                style={{ width: `${maeWidth}%` }}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                              <span>RMSE</span>
                              <span className="font-medium text-slate-600">{formatNumber(item.rmse)}</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-purple-500 rounded-full transition-all"
                                style={{ width: `${rmseWidth}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100">
                  <span className="flex items-center gap-1 text-[10px] text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" /> MAE
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-sm bg-purple-500 inline-block" /> RMSE
                  </span>
                </div>
              </div>

              {/* R² / MAPE Summary */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5 mb-3">
                  <Percent className="h-4 w-4 text-[#002366]" />
                  R² & MAPE Summary
                </h2>
                <div className="space-y-2">
                  {chartData.map((item) => (
                    <div key={item.model} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                      <p className="text-xs font-semibold text-slate-700 mb-2">{item.model}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white rounded-lg border border-slate-100 p-2.5">
                          <p className="text-[10px] text-slate-400 uppercase tracking-wide">R² Score</p>
                          <p className="text-base font-bold text-slate-900 leading-tight">
                            {formatNumber(item.r2)}
                          </p>
                          <p className={`text-[10px] font-medium mt-0.5 ${getStatusColor("r2", item.r2)}`}>
                            {getMetricStatus("r2", item.r2)}
                          </p>
                        </div>
                        <div className="bg-white rounded-lg border border-slate-100 p-2.5">
                          <p className="text-[10px] text-slate-400 uppercase tracking-wide">MAPE</p>
                          <p className="text-base font-bold text-slate-900 leading-tight">
                            {formatNumber(item.mape)}%
                          </p>
                          <p className={`text-[10px] font-medium mt-0.5 ${getStatusColor("mape", item.mape)}`}>
                            {getMetricStatus("mape", item.mape)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Table Modal */}
      {showTable && (
        <EvaluationTable
          metrics={sortedMetrics}
          onClose={() => setShowTable(false)}
        />
      )}
    </div>
  );
}