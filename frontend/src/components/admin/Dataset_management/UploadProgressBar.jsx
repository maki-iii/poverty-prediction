export default function UploadProgressBar({ progress }) {
  if (progress == null) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-3">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[11px] font-semibold text-slate-700">Uploading...</p>
        <span className="text-[11px] font-medium text-slate-500">{progress}%</span>
      </div>
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#002366] transition-all duration-200 ease-out rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}