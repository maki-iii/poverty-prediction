import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import Loader from "../../common/Loader";

export default function UploadButton({ onUpload, uploading, multiple = false }) {
  const fileInputRef = useRef(null);
  const [error, setError] = useState("");

  const handleFileChange = async (e) => {
    const input = e.target;
    const files = Array.from(input.files || []);
    if (!files.length) return;

    const validExtensions = [".csv", ".xlsx", ".xls"];
    const invalidFile = files.find((file) => !validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext)));
    if (invalidFile) {
      setError(`"${invalidFile.name}" must be .csv, .xlsx, or .xls. No files were uploaded.`);
      input.value = "";
      return;
    }

    setError("");
    try {
      await onUpload(multiple ? files : files[0]);
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      input.value = "";
    }
  };

  return (
    <div>
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-2 px-4 h-10 bg-[#002366] text-white rounded-xl text-sm
                   font-semibold hover:bg-[#001a4d] active:scale-[0.98] transition-all duration-150
                   shadow-md shadow-[#002366]/20 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploading ? <Loader /> : <Plus className="w-4 h-4" />}
        {uploading ? "Uploading..." : multiple ? "Bulk Upload" : "Add Dataset"}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        multiple={multiple}
        onChange={handleFileChange}
        className="hidden"
      />

      {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
    </div>
  );
}
