import { useEffect, useMemo, useState } from "react";
import { Upload, Search, RefreshCw, Trash2, CheckCircle, AlertCircle, Clock, File, ChevronLeft, ChevronRight } from "lucide-react";
import {
    uploadDataset,
    getDatasets,
    archiveDataset,
} from "../../api/mlAPI";
import { Alert } from "../../components/common/Alert";
import Loader from "../../components/common/Loader";
import ProgressBar from "../../components/common/ProgressBar";
import ConfirmModal from "../../components/common/ConfirmModal";

export default function DatasetManagement() {
    const [datasets, setDatasets] = useState([]);
    const [uploadFile, setUploadFile] = useState(null);
    const [search, setSearch] = useState("");
    const [dateFilter, setDateFilter] = useState("all");

    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [archivingId, setArchivingId] = useState(null);

    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    // Upload Progress
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState("idle"); // idle, uploading, completed, error

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // Confirm Modal
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [datasetToArchive, setDatasetToArchive] = useState(null);

    // Auto-dismiss alerts after 4 seconds
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(""), 4000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(""), 4000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    const loadDatasets = async () => {
        try {
            setLoading(true);
            const res = await getDatasets();
            setDatasets(res.data.datasets || []);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to load datasets.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDatasets();
    }, []);

    const filteredDatasets = useMemo(() => {
        return datasets.filter((item) => {
            const matchesSearch = item.file_name
                ?.toLowerCase()
                .includes(search.toLowerCase());

            const matchesDate = (() => {
                if (dateFilter === "all") return true;

                const uploadedDate = new Date(item.created_at);
                const today = new Date();

                const startOfToday = new Date(
                    today.getFullYear(),
                    today.getMonth(),
                    today.getDate()
                );

                const startOfWeek = new Date(startOfToday);
                startOfWeek.setDate(startOfWeek.getDate() - 7);

                const startOfMonth = new Date(
                    today.getFullYear(),
                    today.getMonth(),
                    1
                );

                if (dateFilter === "today") {
                    return uploadedDate >= startOfToday;
                }

                if (dateFilter === "week") {
                    return uploadedDate >= startOfWeek;
                }

                if (dateFilter === "month") {
                    return uploadedDate >= startOfMonth;
                }

                return true;
            })();

            return matchesSearch && matchesDate;
        });
    }, [datasets, search, dateFilter]);

    // Pagination calculations
    const totalPages = Math.ceil(filteredDatasets.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedDatasets = filteredDatasets.slice(startIndex, endIndex);

    // Ensure current page is valid
    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const handleUpload = async () => {
        if (!uploadFile) {
            setError("Please select a CSV file.");
            return;
        }

        if (!uploadFile.name.toLowerCase().endsWith(".csv")) {
            setError("Only CSV files are allowed.");
            return;
        }

        try {
            setUploading(true);
            setUploadStatus("uploading");
            setUploadProgress(0);
            setError("");
            setMessage("");

            const formData = new FormData();
            formData.append("file", uploadFile);

            await uploadDataset(formData, (progressEvent) => {
                if (!progressEvent.total) return;

                const percentCompleted = Math.round(
                    (progressEvent.loaded * 100) / progressEvent.total
                );

                setUploadProgress(percentCompleted);
            });

            setUploadProgress(100);
            setUploadStatus("completed");

            setTimeout(() => {
                setMessage("Dataset uploaded successfully.");
                setUploadFile(null);
                setUploading(false);
                setUploadStatus("idle");
                setUploadProgress(0);
                loadDatasets();
            }, 800);
        } catch (err) {
            setUploadStatus("error");
            setError(err.response?.data?.message || "Failed to upload dataset.");
            setUploading(false);

            setTimeout(() => {
                setUploadProgress(0);
                setUploadStatus("idle");
            }, 1500);
        }
    };

    const handleCancelUpload = () => {
        setUploading(false);
        setUploadProgress(0);
        setUploadStatus("idle");
        setUploadFile(null);
    };

    const openArchiveConfirm = (dataset) => {
        setDatasetToArchive(dataset);
        setConfirmOpen(true);
    };

    const handleArchive = async () => {
        if (!datasetToArchive) return;

        try {
            setArchivingId(datasetToArchive.id);
            setError("");
            setMessage("");

            await archiveDataset(datasetToArchive.id, {
                reason: "Archived from Dataset Management page.",
            });

            setMessage("Dataset archived successfully.");
            await loadDatasets();
        } catch (err) {
            setError(err.response?.data?.message || "Failed to archive dataset.");
        } finally {
            setArchivingId(null);
            setConfirmOpen(false);
            setDatasetToArchive(null);
        }
    };

    const formatDate = (value) => {
        if (!value) return "N/A";
        return new Date(value).toLocaleString();
    };

    const getStatusIcon = (status) => {
        if (status === "merged") return <CheckCircle className="h-3 w-3 text-emerald-600" />;
        if (status === "failed") return <AlertCircle className="h-3 w-3 text-red-600" />;
        return <Clock className="h-3 w-3 text-amber-600" />;
    };

    const getStatusClass = (status) => {
        if (status === "merged") return "bg-emerald-50 text-emerald-700 border border-emerald-200";
        if (status === "failed") return "bg-red-50 text-red-700 border border-red-200";
        return "bg-amber-50 text-amber-700 border border-amber-200";
    };

    return (
        <div className="min-h-screen bg-slate-50/50">
            <div className="max-w-7xl mx-auto p-3 space-y-3">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Dataset Management</h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Upload and manage datasets for poverty prediction models
                    </p>
                </div>

                {/* Alerts */}
                {message && (
                    <Alert 
                        type="success" 
                        message={message} 
                        onClose={() => setMessage("")} 
                    />
                )}
                {error && (
                    <Alert 
                        type="error" 
                        message={error} 
                        onClose={() => setError("")} 
                    />
                )}

                {/* Upload Section */}
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 space-y-3">
                    <div>
                        <h2 className="text-sm font-semibold text-slate-900">Upload Dataset</h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Upload a CSV file. New data will be merged into the master dataset during training.
                        </p>
                    </div>

                    {/* Progress Bar */}
                    {uploading && (
                        <ProgressBar
                            progress={uploadProgress}
                            fileName={uploadFile?.name || "File"}
                            status={uploadStatus}
                            message={`${uploadFile?.size ? (uploadFile.size / 1024 / 1024).toFixed(2) : 0} MB`}
                            onCancel={handleCancelUpload}
                            showCancel={true}
                        />
                    )}

                    <div className="flex flex-col sm:flex-row gap-2">
                        <div className="flex-1 relative">
                            <input
                                type="file"
                                accept=".csv"
                                onChange={(e) =>
                                    setUploadFile(e.target.files?.[0] || null)
                                }
                                disabled={uploading}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                id="file-input"
                            />
                            <label
                                htmlFor="file-input"
                                className="flex items-center justify-center gap-1.5 border border-slate-300 rounded-lg px-3 py-2 bg-white hover:bg-slate-50 cursor-pointer transition-colors disabled:opacity-60 text-xs"
                            >
                                <File className="h-3.5 w-3.5 text-slate-400" />
                                <span className="text-slate-600 truncate">
                                    {uploadFile ? uploadFile.name : "Choose CSV file"}
                                </span>
                            </label>
                        </div>

                        <button
                            onClick={handleUpload}
                            disabled={uploading || !uploadFile}
                            className="bg-[#002366] hover:bg-[#001a4d] text-white px-4 py-2 rounded-lg font-semibold text-xs transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 flex-shrink-0 shadow-sm shadow-[#002366]/20 whitespace-nowrap"
                        >
                            {uploading ? (
                                <>
                                    <Loader />
                                    <span>Uploading...</span>
                                </>
                            ) : (
                                <>
                                    <Upload className="h-3 w-3" />
                                    <span>Upload</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Filters Section */}
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 flex flex-col sm:flex-row gap-2">
                    <div className="flex-1 relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search datasets..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-xs bg-white hover:border-slate-400 focus:border-[#002366] focus:ring-1 focus:ring-[#002366]/10 transition-all outline-none"
                        />
                    </div>
                    <select
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white hover:border-slate-400 focus:border-[#002366] focus:ring-1 focus:ring-[#002366]/10 transition-all outline-none flex-shrink-0"
                    >
                        <option value="all">All Dates</option>
                        <option value="today">Today</option>
                        <option value="week">Last 7 Days</option>
                        <option value="month">This Month</option>
                    </select>

                    <button
                        onClick={loadDatasets}
                        disabled={loading}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-1 flex-shrink-0 whitespace-nowrap"
                    >
                        <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                </div>

                {/* Table Section */}
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-3 border-b border-slate-200">
                        <div className="flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                                <h2 className="font-semibold text-slate-900 text-sm">Datasets</h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {filteredDatasets.length} dataset(s) found
                                </p>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center">
                            <div className="flex items-center justify-center gap-2 text-slate-500">
                                <Loader />
                                <span className="text-xs">Loading datasets...</span>
                            </div>
                        </div>
                    ) : filteredDatasets.length === 0 ? (
                        <div className="p-8 text-center">
                            <File className="h-6 w-6 text-slate-300 mx-auto mb-2" />
                            <p className="text-xs text-slate-500">No datasets found</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="text-left px-3 py-2 font-semibold text-slate-700">File Name</th>
                                            <th className="text-left px-3 py-2 font-semibold text-slate-700">Rows</th>
                                            <th className="text-left px-3 py-2 font-semibold text-slate-700">Year Range</th>
                                            <th className="text-left px-3 py-2 font-semibold text-slate-700">Status</th>
                                            <th className="text-left px-3 py-2 font-semibold text-slate-700">Uploaded By</th>
                                            <th className="text-left px-3 py-2 font-semibold text-slate-700">Uploaded At</th>
                                            <th className="text-right px-3 py-2 font-semibold text-slate-700">Action</th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-slate-200">
                                        {paginatedDatasets.map((dataset) => (
                                            <tr
                                                key={dataset.id}
                                                className="hover:bg-slate-50 transition-colors"
                                            >
                                                <td className="px-3 py-2">
                                                    <div className="font-medium text-slate-900 truncate">
                                                        {dataset.file_name}
                                                    </div>
                                                    <div className="text-xs text-slate-400 mt-0.5">
                                                        ID: {dataset.id}
                                                    </div>
                                                </td>

                                                <td className="px-3 py-2 text-slate-600">
                                                    {dataset.rows_count || 0}
                                                </td>

                                                <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                                                    {dataset.year_start || "—"} – {dataset.year_end || "—"}
                                                </td>

                                                <td className="px-3 py-2">
                                                    <div className="flex items-center gap-1.5">
                                                        {getStatusIcon(dataset.status)}
                                                        <span
                                                            className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${getStatusClass(
                                                                dataset.status
                                                            )}`}
                                                        >
                                                            {dataset.status}
                                                        </span>
                                                    </div>
                                                </td>

                                                <td className="px-3 py-2 text-slate-600 text-xs">
                                                    {dataset.uploaded_by_name || "—"}
                                                </td>

                                                <td className="px-3 py-2 text-slate-600 text-xs whitespace-nowrap">
                                                    {formatDate(dataset.created_at)}
                                                </td>

                                                <td className="px-3 py-2 text-right">
                                                    <button
                                                        onClick={() => openArchiveConfirm(dataset)}
                                                        disabled={archivingId === dataset.id}
                                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-red-300 bg-white text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium whitespace-nowrap"
                                                    >
                                                        {archivingId === dataset.id ? (
                                                            <>
                                                                <Loader />
                                                                <span>Archiving...</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Trash2 className="h-3 w-3" />
                                                                <span>Archive</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Controls */}
                            <div className="p-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                                <div className="text-xs text-slate-600 text-center sm:text-left">
                                    Showing <span className="font-semibold">{startIndex + 1}</span> to{" "}
                                    <span className="font-semibold">{Math.min(endIndex, filteredDatasets.length)}</span> of{" "}
                                    <span className="font-semibold">{filteredDatasets.length}</span>
                                </div>

                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                        disabled={currentPage === 1}
                                        className="p-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        title="Previous page"
                                    >
                                        <ChevronLeft className="h-3 w-3 text-slate-600" />
                                    </button>

                                    <div className="flex items-center gap-0.5">
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                            <button
                                                key={page}
                                                onClick={() => setCurrentPage(page)}
                                                className={`w-6 h-6 rounded-lg text-xs font-semibold transition-colors ${
                                                    currentPage === page
                                                        ? "bg-[#002366] text-white"
                                                        : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                                                }`}
                                            >
                                                {page}
                                            </button>
                                        ))}
                                    </div>

                                    <button
                                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                        disabled={currentPage === totalPages}
                                        className="p-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        title="Next page"
                                    >
                                        <ChevronRight className="h-3 w-3 text-slate-600" />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <ConfirmModal
                isOpen={confirmOpen}
                title="Archive Dataset?"
                subtitle="This dataset will be hidden from the active dataset list."
                warning="Archived datasets will no longer appear in Dataset Management, but the activity will remain in the logs."
                confirmLabel={archivingId ? "Archiving..." : "Archive"}
                cancelLabel="Cancel"
                onConfirm={handleArchive}
                onCancel={() => {
                    if (archivingId) return;
                    setConfirmOpen(false);
                    setDatasetToArchive(null);
                }}
                fields={[
                    {
                        key: "file_name",
                        label: "File Name",
                        value: datasetToArchive?.file_name,
                        icon: File,
                    },
                    {
                        key: "rows",
                        label: "Rows",
                        value: datasetToArchive?.rows_count || 0,
                    },
                    {
                        key: "year_range",
                        label: "Year Range",
                        value: `${datasetToArchive?.year_start || "—"} - ${
                            datasetToArchive?.year_end || "—"
                        }`,
                    },
                ]}
            />
        </div>
    );
}