import { useEffect } from "react";
import { X, FileText } from "lucide-react";

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

export default function PredictionResultsTable({ predictions, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#002366]" />
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Prediction Results Table</h2>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Regression-based regional poverty incidence prediction
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        {/* Table */}
        <div className="overflow-auto flex-1">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
              <tr>
                {["Region", "Prediction Year", "Predicted Poverty Incidence"].map((col) => (
                  <th
                    key={col}
                    className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {predictions.map((item) => (
                <tr
                  key={`${item.region}-${item.prediction_year}-table`}
                  className="hover:bg-slate-50/60 transition-colors"
                >
                  <td className="px-4 py-2.5 text-xs font-medium text-slate-800 whitespace-nowrap">
                    {item.region}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                    {item.prediction_year || item.year || "N/A"}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                    {formatNumber(getPredictionValue(item))}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 shrink-0 flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}