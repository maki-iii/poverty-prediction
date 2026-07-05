import { useEffect } from "react";
import { Trophy, CheckCircle, X, TableProperties } from "lucide-react";

const COLUMNS = ["Model", "CV MAE", "Test MAE", "RMSE", "R²", "MAPE", "Result"];

const formatNumber = (value, digits = 4) => {
  if (value === null || value === undefined || value === "") return "N/A";
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return num.toFixed(digits);
};

export default function EvaluationTable({ metrics, onClose }) {
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
        className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <TableProperties className="h-4 w-4 text-[#002366]" />
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Evaluation Metrics Table</h2>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Lower MAE, RMSE, MAPE is better · Higher R² is better
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
                {COLUMNS.map((col) => (
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
              {metrics.map((item) => {
                const isBest = Number(item.is_best) === 1;
                return (
                  <tr
                    key={item.id || item.model_name || item.model}
                    className={isBest ? "bg-emerald-50/50" : "hover:bg-slate-50/60 transition-colors"}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        {isBest && <Trophy className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
                        <span className="text-xs font-semibold text-slate-800 whitespace-nowrap">
                          {item.model_name || item.model}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{formatNumber(item.cv_mae)}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{formatNumber(item.test_mae)}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{formatNumber(item.test_rmse)}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{formatNumber(item.test_r2)}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{formatNumber(item.test_mape)}%</td>
                    <td className="px-4 py-2.5">
                      {isBest ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">
                          <CheckCircle className="h-3 w-3" />
                          Best
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                          Compared
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
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