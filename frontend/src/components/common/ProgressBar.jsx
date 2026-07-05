import { X, CheckCircle, AlertCircle } from "lucide-react";

/**
 * ProgressBar Component - Reusable progress indicator
 * 
 * @param {number} progress - Progress percentage (0-100)
 * @param {string} fileName - Name of the file being uploaded
 * @param {string} status - Status: 'uploading', 'completed', 'error'
 * @param {string} message - Optional message/status text
 * @param {function} onCancel - Optional callback when cancel button is clicked
 * @param {boolean} showCancel - Show cancel button (default: true)
 */
export default function ProgressBar({ 
    progress = 0, 
    fileName = "File", 
    status = "uploading", 
    message = "",
    onCancel,
    showCancel = true,
    className = ""
}) {
    const isCompleted = status === "completed";
    const isError = status === "error";
    const isUploading = status === "uploading";

    // Determine colors based on status
    const getProgressColor = () => {
        if (isError) return "bg-red-500";
        if (isCompleted) return "bg-emerald-500";
        return "bg-[#002366]";
    };

    const getBackgroundColor = () => {
        if (isError) return "bg-red-50";
        if (isCompleted) return "bg-emerald-50";
        return "bg-slate-50";
    };

    const getBorderColor = () => {
        if (isError) return "border-red-200";
        if (isCompleted) return "border-emerald-200";
        return "border-slate-200";
    };

    const getIcon = () => {
        if (isError) return <AlertCircle className="h-5 w-5 text-red-600" />;
        if (isCompleted) return <CheckCircle className="h-5 w-5 text-emerald-600" />;
        return null;
    };

    const getStatusText = () => {
        if (isCompleted) return "Upload completed";
        if (isError) return "Upload failed";
        return `${progress}%`;
    };

    return (
        <div className={`rounded-xl border ${getBorderColor()} ${getBackgroundColor()} p-4 ${className}`}>
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-3">
                        {getIcon()}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">
                                {fileName}
                            </p>
                            {message && (
                                <p className="text-xs text-slate-600 mt-0.5">
                                    {message}
                                </p>
                            )}
                        </div>
                        <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                            {getStatusText()}
                        </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-white rounded-full overflow-hidden border border-slate-200">
                        <div
                            className={`h-full ${getProgressColor()} transition-all duration-300 ease-out`}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                    </div>

                    {/* Status Text */}
                    <div className="mt-2">
                        {isUploading && (
                            <p className="text-xs text-slate-600">
                                Uploading file... Please wait.
                            </p>
                        )}
                        {isCompleted && (
                            <p className="text-xs text-emerald-700">
                                File uploaded successfully!
                            </p>
                        )}
                        {isError && (
                            <p className="text-xs text-red-700">
                                Upload failed. Please try again.
                            </p>
                        )}
                    </div>
                </div>

                {/* Cancel Button */}
                {showCancel && onCancel && isUploading && (
                    <button
                        onClick={onCancel}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white transition-colors flex-shrink-0"
                        title="Cancel upload"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>
        </div>
    );
}