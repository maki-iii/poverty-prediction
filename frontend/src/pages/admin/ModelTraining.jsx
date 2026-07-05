import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Brain,
  Database,
  Play,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowRight,
  BarChart3,
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import {
  getDatasets,
  mergeDatasets,
  trainModels,
  getTrainingStatus,
  getMetrics,
  getPredictions,
  getForecast,
} from "../../api/mlAPI";

import { Alert } from "../../components/common/Alert";
import Loader from "../../components/common/Loader";
import ProgressBar from "../../components/common/ProgressBar";

export default function ModelTraining() {
  const navigate = useNavigate();

  const [datasets, setDatasets] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  const [metrics, setMetrics] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [forecast, setForecast] = useState([]);

  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState(false);
  const [training, setTraining] = useState(false);

  const [currentStep, setCurrentStep] = useState("Idle");
  const [progress, setProgress] = useState(0);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [trainingCompleted, setTrainingCompleted] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);

      const [datasetRes, metricsRes, predictionRes, forecastRes] =
        await Promise.allSettled([
          getDatasets(),
          getMetrics(),
          getPredictions(),
          getForecast(),
        ]);

      if (datasetRes.status === "fulfilled") {
        setDatasets(datasetRes.value.data.datasets || []);
      }

      if (metricsRes.status === "fulfilled") {
        setMetrics(metricsRes.value.data.metrics || []);
      }

      if (predictionRes.status === "fulfilled") {
        setPredictions(predictionRes.value.data.predictions || []);
      }

      if (forecastRes.status === "fulfilled") {
        setForecast(forecastRes.value.data.forecast || []);
      }
    } catch {
      setError("Failed to load training data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const unmergedDatasets = useMemo(() => {
    return datasets.filter(
      (item) => Number(item.is_merged) !== 1 && Number(item.file_deleted) !== 1
    );
  }, [datasets]);

  const bestModel = useMemo(() => {
    return metrics.find((item) => Number(item.is_best) === 1);
  }, [metrics]);

  const filteredDatasets = useMemo(() => {
    return datasets.filter((item) =>
      item.file_name?.toLowerCase().includes(search.toLowerCase())
    );
  }, [datasets, search]);

  const totalPages = Math.ceil(filteredDatasets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDatasets = filteredDatasets.slice(startIndex, endIndex);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const toggleDataset = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleMerge = async () => {
    if (selectedIds.length === 0) {
      setError("Please select at least one dataset to merge.");
      return;
    }

    try {
      setMerging(true);
      setError("");
      setMessage("");

      await mergeDatasets(selectedIds);

      setMessage("Selected datasets merged into the master dataset.");
      setSelectedIds([]);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to merge datasets.");
    } finally {
      setMerging(false);
    }
  };

  const trainingSteps = [
    { label: "Starting training pipeline", progress: 5 },
    { label: "Preprocessing master dataset", progress: 10 },
    { label: "Creating lag features", progress: 25 },
    { label: "Training and comparing models", progress: 40 },
    { label: "Generating regression prediction", progress: 80 },
    { label: "Running ARIMA forecasting", progress: 90 },
    { label: "Training completed", progress: 100 },
  ];

const pollTrainingStatus = () => {
  const interval = setInterval(async () => {
    try {
      const res = await getTrainingStatus();
      const status = res.data.trainingStatus;

      setCurrentStep(status.step);
      setProgress(status.progress);

      if (status.status === "completed") {
        clearInterval(interval);
        setTraining(false);
        setMessage("Model training completed successfully.");
        await loadData();
        setTrainingCompleted(true);

        setTimeout(() => {
          setCurrentStep("Idle");
          setProgress(0);
        }, 1200);
      }

      if (status.status === "failed") {
        clearInterval(interval);
        setTraining(false);
        setCurrentStep("Training failed");
        setProgress(0);
        setError("Model training failed.");
      }
    } catch {
      clearInterval(interval);
      setTraining(false);
      setError("Failed to get training status.");
    }
  }, 1000);

  return interval;
};

const handleTrain = async () => {
  try {
    setTraining(true);
    setError("");
    setMessage("");
    setProgress(5);
    setCurrentStep("Starting training pipeline");

    pollTrainingStatus();

    await trainModels();
  } catch (err) {
    setCurrentStep("Training failed");
    setProgress(0);
    setError(err.response?.data?.message || "Model training failed.");
    setTraining(false);
  }
};

  const getStatusBadge = (dataset) => {
    if (Number(dataset.is_merged) === 1) {
      return "Merged";
    }

    return "Not Merged";
  };

  const formatNumber = (value) => {
    if (value === null || value === undefined || value === "") return "N/A";

    const num = Number(value);

    if (Number.isNaN(num)) return value;

    return num.toFixed(4);
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto p-3 space-y-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Model Training
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Merge selected datasets, train machine learning models, and review model results.
          </p>
        </div>

        {message && (
          <Alert type="success" message={message} onClose={() => setMessage("")} />
        )}

        {error && (
          <Alert type="error" message={error} onClose={() => setError("")} />
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 auto-rows-max xl:auto-rows-fr">
          <div className="xl:col-span-2 bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-3 border-b border-slate-200 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-slate-900 flex items-center gap-1.5 text-sm">
                  <Database className="h-4 w-4 text-[#002366] flex-shrink-0" />
                  Select Datasets to Merge
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose datasets to include in the master training dataset.
                </p>
              </div>

              <button
                onClick={loadData}
                disabled={loading}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50 flex items-center gap-1 flex-shrink-0 whitespace-nowrap"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            {/* Search Bar */}
            {datasets.length > 0 && (
              <div className="p-2 border-b border-slate-200 bg-slate-50">
                <input
                  type="text"
                  placeholder="Search datasets..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white hover:border-slate-400 focus:border-[#002366] focus:ring-1 focus:ring-[#002366]/10 transition-all outline-none"
                />
              </div>
            )}

            {loading ? (
              <div className="p-6 flex items-center justify-center gap-2 text-slate-500">
                <Loader />
                <span className="text-xs">Loading datasets...</span>
              </div>
            ) : datasets.length === 0 ? (
              <div className="p-6 text-center text-slate-500">
                <FileText className="h-6 w-6 mx-auto mb-1 text-slate-300" />
                <p className="text-xs">No uploaded datasets found.</p>
              </div>
            ) : filteredDatasets.length === 0 ? (
              <div className="p-6 text-center text-slate-500">
                <FileText className="h-6 w-6 mx-auto mb-1 text-slate-300" />
                <p className="text-xs">No datasets match your search.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 text-left"></th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">
                        File Name
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">
                        Rows
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">
                        Year Range
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {paginatedDatasets.map((dataset) => {
                      const alreadyMerged = Number(dataset.is_merged) === 1;
                      const fileDeleted = Number(dataset.file_deleted) === 1;
                      const disabled = alreadyMerged || fileDeleted;

                      return (
                        <tr key={dataset.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              disabled={disabled}
                              checked={selectedIds.includes(dataset.id)}
                              onChange={() => toggleDataset(dataset.id)}
                              className="h-3 w-3"
                            />
                          </td>

                          <td className="px-3 py-2">
                            <p className="font-medium text-slate-900">
                              {dataset.file_name}
                            </p>
                            <p className="text-xs text-slate-400">
                              ID: {dataset.id}
                            </p>
                          </td>

                          <td className="px-3 py-2 text-slate-600">
                            {dataset.rows_count || 0}
                          </td>

                          <td className="px-3 py-2 text-slate-600 text-xs">
                            {dataset.year_start || "—"} – {dataset.year_end || "—"}
                          </td>

                          <td className="px-3 py-2">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full border font-medium inline-block ${
                                alreadyMerged
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                              {getStatusBadge(dataset)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {filteredDatasets.length > 0 && (
              <div className="p-2 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2 flex-wrap">
                <div className="text-xs text-slate-600">
                  Showing <span className="font-semibold">{startIndex + 1}</span> to{" "}
                  <span className="font-semibold">{Math.min(endIndex, filteredDatasets.length)}</span> of{" "}
                  <span className="font-semibold">{filteredDatasets.length}</span>
                </div>

                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-1 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Previous page"
                  >
                    <span className="text-xs">«</span>
                  </button>

                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-5 h-5 rounded text-xs font-semibold transition-colors ${
                          currentPage === page
                            ? "bg-[#002366] text-white"
                            : "border border-slate-300 text-slate-700 hover:bg-white"
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Next page"
                  >
                    <span className="text-xs">»</span>
                  </button>
                </div>
              </div>
            )}

            <div className="p-3 border-t border-slate-200 flex justify-between items-center gap-2">
              <p className="text-xs text-slate-500">
                {selectedIds.length} selected
              </p>

              <button
                onClick={handleMerge}
                disabled={merging || selectedIds.length === 0}
                className="bg-[#002366] hover:bg-[#001a4d] text-white px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 flex-shrink-0"
              >
                {merging ? (
                  <>
                    <Loader />
                    Merging...
                  </>
                ) : (
                  <>
                    <Database className="h-3 w-3" />
                    Merge
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 space-y-3 flex flex-col">
            <div>
              <h2 className="font-semibold text-slate-900 flex items-center gap-1.5 text-sm">
                <Brain className="h-4 w-4 text-[#002366]" />
                Train Model
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Uses the current master dataset.
              </p>
            </div>

            {training && (
              <ProgressBar
                progress={progress}
                fileName="Model Training"
                status="uploading"
                message={currentStep}
                showCancel={false}
              />
            )}

            {!training && currentStep !== "Idle" && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2 text-xs text-emerald-700 flex items-center gap-1.5">
                <CheckCircle className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{currentStep}</span>
              </div>
            )}

            <button
              onClick={handleTrain}
              disabled={training}
              className="w-full bg-[#002366] hover:bg-[#001a4d] text-white px-3 py-2 rounded-lg text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
            >
              {training ? (
                <>
                  <Loader />
                  Training...
                </>
              ) : (
                <>
                  <Play className="h-3 w-3" />
                  Train Model
                </>
              )}
            </button>

            <div className="rounded-lg bg-slate-50 border border-slate-200 p-2 flex-1 overflow-hidden flex flex-col">
              <h3 className="text-xs font-semibold text-slate-800 pb-1 flex-shrink-0">
                Pipeline Steps
              </h3>

              <div className="space-y-0.5 flex-1 overflow-y-auto">
                {trainingSteps.map((step) => {
                  const isCompleted = progress > step.progress;
                  const isCurrent =
                    currentStep === step.label ||
                    progress === step.progress;

                  return (
                    <div
                      key={step.label}
                      className={`flex items-center gap-1.5 text-xs px-1 py-0.5 rounded transition-colors ${
                        isCurrent
                          ? "text-[#002366] font-semibold bg-blue-50"
                          : isCompleted
                          ? "text-emerald-600 font-medium"
                          : "text-slate-500"
                      }`}
                    >
                      {isCurrent ? (
                        <Clock className="h-2.5 w-2.5 flex-shrink-0 animate-spin" />
                      ) : isCompleted ? (
                        <CheckCircle className="h-2.5 w-2.5 flex-shrink-0 text-emerald-600" />
                      ) : (
                        <CheckCircle className="h-2.5 w-2.5 flex-shrink-0 text-slate-300" />
                      )}

                      <span className="truncate">{step.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
              <div className="space-y-2">
                <button
                  onClick={() => navigate("/admin/model-evaluation")}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1"
                >
                  <BarChart3 className="h-3 w-3" />
                  View Model Evaluation
                </button>

                <button
                  onClick={() => navigate("/admin/regional-analysis")}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1"
                >
                  <ArrowRight className="h-3 w-3" />
                  View Regional Analysis
                </button>
              </div>
          </div>
        </div>

      </div>
    </div>
  );
}