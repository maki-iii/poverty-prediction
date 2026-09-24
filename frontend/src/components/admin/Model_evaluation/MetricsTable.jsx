import { Trophy } from "lucide-react";

export default function MetricsTable({ results, bestModel }) {
  if (!results || Object.keys(results).length === 0) {
    return (
      <div className="text-center text-xs text-slate-400 py-6 border border-dashed border-slate-200 rounded-xl">
        No evaluation results yet. Train models first.
      </div>
    );
  }

  const modelNames = Object.keys(results);

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-xl">
      <table className="min-w-full divide-y divide-slate-100 text-xs">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">
              Model
            </th>
            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">
              RMSE
            </th>
            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">
              MAE
            </th>
            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">
              R²
            </th>
            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {modelNames.map((name) => {
            const metrics = results[name];
            const isBest = name === bestModel;
            return (
              <tr key={name} className={`hover:bg-slate-50 transition-colors ${isBest ? "bg-emerald-50/50" : ""}`}>
                <td className="px-3 py-2 font-medium text-slate-700 capitalize flex items-center gap-1.5">
                  {isBest && <Trophy className="w-3.5 h-3.5 text-emerald-600" />}
                  {name.replace("_", " ")}
                </td>
                <td className="px-3 py-2 text-slate-600">{metrics.rmse.toFixed(4)}</td>
                <td className="px-3 py-2 text-slate-600">{metrics.mae.toFixed(4)}</td>
                <td className="px-3 py-2 text-slate-600">{metrics.r2 == null ? "N/A" : metrics.r2.toFixed(4)}</td>
                <td className="px-3 py-2">
                  {isBest ? (
                    <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                      Best Model
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
                      —
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}