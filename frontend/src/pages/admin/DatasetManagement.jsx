import { useState, useMemo, useEffect, useRef } from "react";
import { Database, FileClock, CheckCircle2 } from "lucide-react";
import { useDatasets, useDatasetActions } from "../../hooks/useDatasets";
import useProcessingProgress from "../../hooks/useProcessingProgress";

import SearchBar from "../../components/common/SearchBar";
import YearRangeFilter from "../../components/common/YearRangeFilter";
import { availableYears, matchesYearRange } from "../../utils/yearFilter";
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
import { uploadDatasetQueue } from "../../services/datasetUploadQueue";
import { mergeDatasetQueue, validateMergeSelection } from "../../services/datasetMergeQueue";

export default function DatasetManagement() {
  const [search, setSearch] = useState("");
  const [yearRange, setYearRange] = useState({ startYear: "", endYear: "" });
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState([]);
  const [selectedMergeIds, setSelectedMergeIds] = useState([]);
  const [merging, setMerging] = useState(false);
  const [mergeResults, setMergeResults] = useState([]);
  const actionInProgress = useRef(false);
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

  const years = availableYears([...(pendingDatasets || []), ...(processedDatasets || [])]);

  // Filter by the assigned survey year, never the upload timestamp.
  const filterDatasets = (list) => {
    if (!list) return [];
    return list.filter((d) => {
      const matchesSearch = d.original_filename.toLowerCase().includes(search.toLowerCase());
      return matchesSearch && matchesYearRange(d.year, yearRange);
    });
  };

  const filteredPending = useMemo(
    () => filterDatasets(pendingDatasets),
    [pendingDatasets, search, yearRange]
  );
  const filteredProcessed = useMemo(
    () => filterDatasets(processedDatasets),
    [processedDatasets, search, yearRange]
  );
  const selectedMergeDatasets = filteredProcessed.filter((dataset) => selectedMergeIds.includes(dataset.id));
  const selectMergeDatasets = (datasets, checked) => {
    const ids = datasets.map((dataset) => dataset.id);
    setSelectedMergeIds((previous) => checked
      ? [...new Set([...previous, ...ids])]
      : previous.filter((id) => !ids.includes(id)));
  };
  const confirmBulkMerge = () => {
    if (!selectedMergeDatasets.length || merging) return;
    try {
      validateMergeSelection(selectedMergeDatasets);
      setConfirmAction({ type: "bulkMerge", datasets: [...selectedMergeDatasets] });
    } catch (error) {
      toast.error(error.message);
    }
  };

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
  }, [search, yearRange]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const handleUpload = async (selection) => {
    const files = Array.isArray(selection) ? selection : [selection];
    setUploading(true);
    try {
      const results = await uploadDatasetQueue(files, uploadDataset, setUploadResults);
      const uploaded = results.filter((entry) => entry.status === "uploaded").length;
      if (uploaded) toast.success(`${uploaded} of ${files.length} dataset(s) uploaded successfully`);
      if (results.some((entry) => entry.status !== "uploaded")) {
        toast.info("Some files were not uploaded or could not be confirmed. See the upload results.");
      }
    } finally {
      setUploading(false);
      refetchPending();
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
    if (!confirmAction || actionInProgress.current) return;
    actionInProgress.current = true;
    const { type, dataset } = confirmAction;

    try {
      if (type === "bulkMerge") {
        setConfirmAction(null);
        setMerging(true);
        const results = await mergeDatasetQueue(confirmAction.datasets, mergeDataset, setMergeResults);
        const merged = results.filter((entry) => entry.status === "merged");
        if (merged.length) toast.success(`${merged.length} of ${results.length} datasets merged into actuals`);
        if (merged.length !== results.length) toast.info("Some datasets were not merged or could not be confirmed. See the merge results.");
        // Clear the batch selection so a retry requires reviewing current data.
        setSelectedMergeIds([]);
      } else if (type === "delete") {
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
      if (type === "bulkMerge") {
        setMerging(false);
        refetchProcessed();
        refetchPending();
      }
      actionInProgress.current = false;
      setConfirmAction(null);
    }
  };

  const confirmModalConfig = useMemo(() => {
    if (!confirmAction) return null;
    const { type, dataset } = confirmAction;

    if (type === "bulkMerge") {
      return {
        title: `Merge ${confirmAction.datasets.length} Datasets?`,
        subtitle: "Review the selected datasets before adding them to actuals.",
        warning: "Existing actual values for the same region and year will be updated. Each dataset is merged separately; completed merges are kept if you stop. Re-run forecasting and training afterward.",
        confirmLabel: "Merge Selected",
        cancelLabel: "Cancel",
        fields: confirmAction.datasets.map((item) => ({
          key: String(item.id), label: `${item.region} / ${item.processed_year}`, value: item.original_filename,
        })),
      };
    }
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
        <div className="flex flex-wrap gap-2">
          <UploadButton onUpload={handleUpload} uploading={uploading} />
          <UploadButton onUpload={handleUpload} uploading={uploading} multiple />
        </div>
      </div>

      {/* Progress bars */}
      {uploadResults.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 space-y-3" aria-live="polite">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-700">
              {uploading ? "Uploading datasets" : "Upload results"} — {uploadResults.filter((entry) => entry.status === "uploaded").length} of {uploadResults.length} uploaded
            </p>
            {!uploading && <button type="button" className="text-xs text-slate-500 hover:text-[#002366]" onClick={() => setUploadResults([])}>Dismiss</button>}
          </div>
          {uploadResults.map((entry, index) => entry.status === "uploading" && (
            <UploadProgressBar key={index} progress={entry.progress} label={`File ${index + 1} of ${uploadResults.length}: ${entry.name}${entry.progress === 100 ? " — Saving..." : ""}`} />
          ))}
          <ul className="max-h-48 overflow-y-auto space-y-1 text-xs">
            {uploadResults.map((entry, index) => (
              <li key={index} className={`break-all ${["failed", "unconfirmed"].includes(entry.status) ? "text-red-600" : "text-slate-600"}`}>
                {entry.name} — {entry.status}{entry.message ? `: ${entry.message}` : ""}
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500">Process each uploaded dataset with its own year, poverty threshold, and poverty incidence.</p>
        </div>
      )}
      {processStatus && processStatus.status !== "idle" && (
        <ProcessingProgressBar status={processStatus} />
      )}
      {mergeResults.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 space-y-3" aria-live="polite">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-700">
              {merging ? "Merging datasets" : "Merge results"} — {mergeResults.filter((entry) => entry.status === "merged").length} of {mergeResults.length} merged
            </p>
            {!merging && <button type="button" className="text-xs text-slate-500 hover:text-[#002366]" onClick={() => setMergeResults([])}>Dismiss</button>}
          </div>
          <ul className="max-h-48 overflow-y-auto space-y-1 text-xs">
            {mergeResults.map((entry) => (
              <li key={entry.id} className={`break-all ${["failed", "unconfirmed"].includes(entry.status) ? "text-red-600" : "text-slate-600"}`}>
                {entry.name} ({entry.region} / {entry.year}) — {entry.status}{entry.message ? `: ${entry.message}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 bg-white border border-slate-200 rounded-xl p-4">
        <SearchBar value={search} onChange={(value) => { setSearch(value); setSelectedMergeIds([]); }} placeholder="Search by filename..." />
        <YearRangeFilter
          years={years}
          startYear={yearRange.startYear}
          endYear={yearRange.endYear}
          onChange={(value) => { setYearRange(value); setSelectedMergeIds([]); }}
        />
      </div>

      {(yearRange.startYear || yearRange.endYear) && <p className="text-xs text-slate-500">Datasets without an assigned survey year are hidden. Clear the year filter to see pending uploads.</p>}

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
        {filteredProcessed.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 mb-3 text-xs">
            <button type="button" disabled={merging || running || processedLoading || !!processedError}
              onClick={() => selectMergeDatasets(filteredProcessed, true)}
              className="font-semibold text-[#002366] disabled:opacity-50">Select all filtered ({filteredProcessed.length})</button>
            <button type="button" disabled={merging} onClick={() => setSelectedMergeIds([])}
              className="text-slate-500 disabled:opacity-50">Clear selection</button>
            <span className="text-slate-500">{selectedMergeDatasets.length} selected</span>
            <button type="button" onClick={confirmBulkMerge}
              disabled={!selectedMergeDatasets.length || merging || running || processedLoading || !!processedError}
              className="ml-auto px-3 py-2 font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed">
              {merging ? "Merging..." : "Merge Selected"}
            </button>
          </div>
        )}
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
              selectedIds={selectedMergeIds}
              onSelect={(id, checked) => selectMergeDatasets([{ id }], checked)}
              onSelectPage={selectMergeDatasets}
              busy={merging || running}
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
          busy={running}
        />
      )}
    </div>
  );
}
