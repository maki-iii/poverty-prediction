import { formatNumber } from "../../../utils/formatNumber.js";
import { BadgeCheck, Trophy } from "lucide-react";
import { useModelComparison } from "../../../hooks/usePoverty";
import Loader from "../../common/Loader";

export default function ModelMetricsSummary() {
  const { data, loading, error } = useModelComparison();

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-2">
      <div className="flex items-center gap-1 mb-1.5">
        <BadgeCheck className="w-3 h-3 text-slate-400" />
        <p className="text-[8px] font-bold text-slate-600 uppercase tracking-wider">
          Model Metrics
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-3">
          <Loader />
        </div>
      ) : error ? (
        <p className="text-[9px] text-slate-400 text-center py-2">
          No trained model yet.
        </p>
      ) : (
        <div className="space-y-1">
          {Object.entries(data.results).map(([name, metrics]) => {
            const isBest = name === data.best_model;

            return (
              <div
                key={name}
                className={`flex items-center justify-between px-2 py-1 rounded ${
                  isBest ? "bg-emerald-50" : "bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-1 min-w-0">
                  {isBest && (
                    <Trophy className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                  )}

                  <span className="text-[9px] font-semibold text-slate-700 capitalize truncate">
                    {name.replace("_", " ")}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[8px] text-slate-500">
                    RMSE{" "}
                    <span className="font-bold text-slate-700">
                      {formatNumber(metrics.rmse)}
                    </span>
                  </span>

                  <span className="text-[8px] text-slate-500">
                    R²{" "}
                    <span className="font-bold text-slate-700">
                      {metrics.r2 == null ? "N/A" : formatNumber(metrics.r2)}
                    </span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}