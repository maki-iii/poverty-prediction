import { useState, useMemo, useEffect } from "react";
import { Database, FileClock, CheckCircle2 } from "lucide-react";
import { useDatasets, useDatasetActions } from "../../hooks/useDatasets";
import useProcessingProgress from "../../hooks/useProcessingProgress";

import SearchBar from "../../components/common/SearchBar";
import DateRangeFilter from "../../components/common/DateRangeFilter";
import Loader from "../../components/common/Loader";
import ConfirmModal from "../../components/common/ConfirmModal";
import Pagination from "../../components/common/Pagination";
import usePagination from "../../hooks/usePagination";
import UploadButton from "../../components/admin/Dataset_management/UploadButton";
import ProcessModal from "../../components/admin/Dataset_management/ProcessModal";
import PendingDatasetsTable from "../../components/admin/Dataset_management/PendingDatasetTable";
import ProcessedDatasetsTable from "../../components/admin/Dataset_management/ProcessedDatasetTable";
import UploadProgressBar from "../../components/admin/Dataset_management/UploadProgressBar";
import ProcessingProgressBar from "../../components/admin/Dataset_management/ProcessingProgressBar";
import { useToast } from "../../context/ToastContext";

export default function DatasetManagement() {
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const toast = useToast();

  const {
    data: pendingDatasets,
    loading: pendingLoading,
    error: pendingError,
    refetch: refetchPending,
  } = useDatasets("pending");

  const {
    data: processedDatasets,
    loading: processedLoading,
    error: processedError,
    refetch: refetchProcessed,
  } = useDatasets("processed");

  const { uploadDataset, processDataset, mergeDataset, deleteDataset, running } =
    useDatasetActions();

  const {
    status: processStatus,
    start: startProcessing,
    reset: resetProcessing,
  } = useProcessingProgress();

  // --- Client-side filtering (search + date range) ---
  const filterDatasets = (list) => {
    if (!list) return [];
    return list.filter((d) => {
      const matchesSearch = d.original_filename.toLowerCase().includes(search.toLowerCase());
      const uploadedDate = d.uploaded_at ? new Date(d.uploaded_at) : null;
      const matchesStart =
        !dateRange.startDate || (uploadedDate && uploadedDate >= new Date(dateRange.startDate));
      const matchesEnd =
        !dateRange.endDate ||
        (uploadedDate && uploadedDate <= new Date(dateRange.endDate + "T23:59:59"));
      return matchesSearch && matchesStart && matchesEnd;
    });
  };

  const filteredPending = useMemo(
    () => filterDatasets(pendingDatasets),
    [pendingDatasets, search, dateRange]
  );
  const filteredProcessed = useMemo(
    () => filterDatasets(processedDatasets),
    [processedDatasets, search, dateRange]
  );

  // --- Pagination (one per table, since they're independent lists) ---
  const {
    paginatedItems: paginatedPending,
    currentPage: pendingPage,
    totalItems: pendingTotal,
    pageSize: pendingPageSize,
    goToPage: goToPendingPage,
    resetPage: resetPendingPage,
  } = usePagination(filteredPending, 5);

  const {
    paginatedItems: paginatedProcessed,
    currentPage: processedPage,
    totalItems: processedTotal,
    pageSize: processedPageSize,
    goToPage: goToProcessedPage,
    resetPage: resetProcessedPage,
  } = usePagination(filteredProcessed, 5);

  // Reset both tables to page 1 whenever filters change
  useEffect(() => {
    resetPendingPage();
    resetProcessedPage();
  }, [search, dateRange]); // eslint-disable-line react-hooks/exhaustive-deps

  // React once when a processing job (started via handleProcess) finishes
  useEffect(() => {
    if (processStatus?.status === "completed") {
      toast.success("Dataset processed successfully");
      refetchPending();
      refetchProcessed();
    } else if (processStatus?.status === "failed") {
      toast.error(processStatus.message || "Processing failed");
    }
  }, [processStatus?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Action handlers ---
  const handleUpload = async (file) => {
    setUploadProgress(0);
    try {
      await uploadDataset(file, (percent) => setUploadProgress(percent));
      toast.success(`"${file.name}" uploaded successfully`);
      refetchPending();
    } catch (err) {
      toast.error(err.message || "Failed to upload dataset");
      throw err;
    } finally {
      setUploadProgress(null);
    }
  };

  const handleProcess = async (datasetId, payload) => {
    resetProcessing();
    try {
      await startProcessing(datasetId, () => processDataset(datasetId, payload));
    } catch (err) {
      toast.error(err.message || "Failed to start processing");
      throw err;
    }
  };

  const handleConfirmedAction = async () => {
    if (!confirmAction) return;
    const { type, dataset } = confirmAction;

    try {
      if (type === "delete") {
        await deleteDataset(dataset.id);
        toast.success(`"${dataset.original_filename}" deleted`);
        refetchPending();
        refetchProcessed();
      } else if (type === "merge") {
        await mergeDataset(dataset.id);
        toast.success(`"${dataset.original_filename}" merged into actuals`);
        refetchProcessed();
      }
    } catch (err) {
      toast.error(err.message || `Failed to ${type} dataset`);
    } finally {
      setConfirmAction(null);
    }
  };

  const confirmModalConfig = useMemo(() => {
    if (!confirmAction) return null;
    const { type, dataset } = confirmAction;

    if (type === "delete") {
      return {
        title: "Delete Dataset?",
        subtitle: "This action cannot be undone.",
        warning: "The uploaded file and any computed values will be permanently removed.",
        confirmLabel: "Delete",
        cancelLabel: "Cancel",
        fields: [{ key: "filename", label: "Filename", value: dataset.original_filename }],
      };
    }
    return {
      title: "Merge into Actuals?",
      subtitle: "This will add it to your training data.",
      warning: "You'll need to re-run the ML pipeline to reflect this new data in predictions.",
      confirmLabel: "Merge",
      cancelLabel: "Cancel",
      fields: [
        { key: "region", label: "Region / Year", value: `${dataset.region} / ${dataset.processed_year}` },
        { key: "poverty", label: "Poverty Incidence", value: `${dataset.processed_poverty_incidence}%` },
      ],
    };
  }, [confirmAction]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#002366]/10">
            <Database className="w-5 h-5 text-[#002366]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#002366] tracking-tight">Dataset Management</h1>
            <p className="text-xs text-slate-500">Upload, process, and merge survey data</p>
          </div>
        </div>
        <UploadButton onUpload={handleUpload} uploading={uploadProgress !== null} />
      </div>

      {/* Progress bars */}
      {uploadProgress !== null && <UploadProgressBar progress={uploadProgress} />}
      {processStatus && processStatus.status !== "idle" && (
        <ProcessingProgressBar status={processStatus} />
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 bg-white border border-slate-200 rounded-xl p-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by filename..." />
        <DateRangeFilter
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
          onChange={setDateRange}
        />
      </div>

      {/* Table 1: Pending uploads */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <FileClock className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
            Pending Uploads
          </h2>
          <span className="text-xs text-slate-400">({filteredPending.length})</span>
        </div>
        {pendingLoading ? (
          <div className="flex justify-center py-6">
            <Loader />
          </div>
        ) : pendingError ? (
          <p className="text-sm text-red-600">{pendingError}</p>
        ) : (
          <>
            <PendingDatasetsTable
              datasets={paginatedPending}
              onProcess={setSelectedDataset}
              onDelete={(id) =>
                setConfirmAction({
                  type: "delete",
                  dataset: filteredPending.find((d) => d.id === id),
                })
              }
            />
            <Pagination
              currentPage={pendingPage}
              totalItems={pendingTotal}
              pageSize={pendingPageSize}
              onPageChange={goToPendingPage}
            />
          </>
        )}
      </section>

      {/* Table 2: Processed, ready to merge */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
            Processed Datasets
          </h2>
          <span className="text-xs text-slate-400">({filteredProcessed.length})</span>
        </div>
        {processedLoading ? (
          <div className="flex justify-center py-6">
            <Loader />
          </div>
        ) : processedError ? (
          <p className="text-sm text-red-600">{processedError}</p>
        ) : (
          <>
            <ProcessedDatasetsTable
              datasets={paginatedProcessed}
              onMerge={(id) =>
                setConfirmAction({
                  type: "merge",
                  dataset: filteredProcessed.find((d) => d.id === id),
                })
              }
              onDelete={(id) =>
                setConfirmAction({
                  type: "delete",
                  dataset: filteredProcessed.find((d) => d.id === id),
                })
              }
            />
            <Pagination
              currentPage={processedPage}
              totalItems={processedTotal}
              pageSize={processedPageSize}
              onPageChange={goToProcessedPage}
            />
          </>
        )}
      </section>

      {/* Process modal */}
      {selectedDataset && (
        <ProcessModal
          dataset={selectedDataset}
          onClose={() => setSelectedDataset(null)}
          onSubmit={handleProcess}
          processing={processStatus?.status === "running"}
        />
      )}

      {/* Confirm modal (delete / merge) */}
      {confirmModalConfig && (
        <ConfirmModal
          isOpen={!!confirmAction}
          onConfirm={handleConfirmedAction}
          onCancel={() => setConfirmAction(null)}
          {...confirmModalConfig}
        />
      )}
    </div>
  );
}