import { useState } from "react";
import { X, FileSpreadsheet } from "lucide-react";
import Loader from "../../common/Loader";

export default function ProcessModal({ dataset, onClose, onSubmit, processing }) {
  const [surveyType, setSurveyType] = useState("apis");
  const [year, setYear] = useState("");
  const [inflationRate, setInflationRate] = useState("");
  const [povertyIncidence, setPovertyIncidence] = useState("");
  const [error, setError] = useState("");

  if (!dataset) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!year || inflationRate === "" || povertyIncidence === "") {
      setError("All fields are required.");
      return;
    }

    try {
      await onSubmit(dataset.id, {
        surveyType,
        year: Number(year),
        inflationRate: Number(inflationRate),
        povertyIncidence: Number(povertyIncidence),
      });
      onClose();
    } catch (err) {
      setError(err.message || "Processing failed");
    }
  };

  const inputClass =
    "w-full px-3 h-10 border border-slate-200 rounded-xl text-sm text-slate-800 " +
    "focus:outline-none focus:ring-2 focus:ring-[#002366]/30 focus:border-[#002366] transition";
  const labelClass = "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5";

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 w-full bg-[#002366]" />

        <div className="p-6">
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0 bg-[#002366]/10">
                <FileSpreadsheet className="h-5 w-5 text-[#002366]" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#002366] tracking-tight leading-tight">
                  Process Dataset
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[220px]">
                  {dataset.original_filename}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>Survey Type</label>
              <select
                value={surveyType}
                onChange={(e) => setSurveyType(e.target.value)}
                className={inputClass}
              >
                <option value="apis">APIS</option>
                <option value="fies">FIES</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Year</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="1998"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Inflation (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={inflationRate}
                  onChange={(e) => setInflationRate(e.target.value)}
                  placeholder="9.2"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Poverty Incidence (%)</label>
              <input
                type="number"
                step="0.01"
                value={povertyIncidence}
                onChange={(e) => setPovertyIncidence(e.target.value)}
                placeholder="20.65"
                className={inputClass}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                <p className="text-[11px] text-red-600 leading-snug">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="h-11 rounded-xl border border-slate-200 bg-white text-sm font-semibold
                           text-slate-600 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]
                           transition-all duration-150"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={processing}
                className="h-11 rounded-xl bg-[#002366] text-white text-sm font-semibold
                           hover:bg-[#001a4d] active:scale-[0.98] transition-all duration-150
                           shadow-md shadow-[#002366]/20 disabled:opacity-50 flex items-center
                           justify-center gap-2"
              >
                {processing ? <Loader /> : "Process"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}