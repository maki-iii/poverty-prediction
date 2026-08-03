import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";

export default function PredictionsTrendCard({ actuals, predictions }) {
  const analysis = useMemo(() => {
    if (!actuals || actuals.length === 0 || !predictions || predictions.length === 0) {
      return null;
    }

    const sortedActuals = [...actuals].sort((a, b) => a.year - b.year);
    const sortedPredictions = [...predictions].sort((a, b) => a.year - b.year);

    const lastActual = sortedActuals[sortedActuals.length - 1];
    const lastPrediction = sortedPredictions[sortedPredictions.length - 1];

    const overallChange =
      lastPrediction.predicted_poverty_incidence - lastActual.poverty_incidence;
    const overallPctChange = (overallChange / lastActual.poverty_incidence) * 100;

    const direction = overallChange > 0.05 ? "increase" : overallChange < -0.05 ? "decrease" : "stay stable";

    const rows = sortedPredictions.map((p) => {
      const change = p.predicted_poverty_incidence - lastActual.poverty_incidence;
      const pctChange = (change / lastActual.poverty_incidence) * 100;
      return { year: p.year, predicted: p.predicted_poverty_incidence, change, pctChange };
    });

    return { lastActual, lastPrediction, overallChange, overallPctChange, direction, rows };
  }, [actuals, predictions]);

  if (!analysis) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-slate-400 py-6 border border-dashed border-slate-200 rounded-xl min-h-[460px]">
        Not enough data yet. Make sure actuals and predictions are both available.
      </div>
    );
  }

  const { lastActual, lastPrediction, overallChange, overallPctChange, direction, rows } = analysis;

  const isUp = direction === "increase";
  const isDown = direction === "decrease";
  const TrendIcon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
  const accentBg = isUp ? "bg-red-50 border-red-200" : isDown ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200";
  const accentText = isUp ? "text-red-600" : isDown ? "text-emerald-600" : "text-slate-500";
  const gradientFrom = isUp ? "from-red-600" : isDown ? "from-emerald-600" : "from-slate-500";
  const gradientTo = isUp ? "to-red-700" : isDown ? "to-emerald-700" : "to-slate-600";

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col min-h-[460px]">
      <div className={`h-1 w-full bg-gradient-to-r ${gradientFrom} ${gradientTo}`} />

      <div className="p-4 flex-1 flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className={`flex items-center justify-center w-7 h-7 rounded-lg ${accentBg}`}>
            <Activity className={`w-4 h-4 ${accentText}`} />
          </div>
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Prediction Trend Analysis
          </p>
        </div>

        {/* Hero stat row */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              {lastActual.year} Actual
            </p>
            <p className="text-lg font-bold text-slate-700">{lastActual.poverty_incidence}%</p>
          </div>
          <div className={`bg-gradient-to-br ${gradientFrom} ${gradientTo} rounded-xl p-3 text-white shadow-md`}>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-white/70 mb-1">
              {lastPrediction.year} Projected
            </p>
            <p className="text-lg font-bold">{lastPrediction.predicted_poverty_incidence}%</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Net Change
            </p>
            <p className={`text-lg font-bold ${accentText}`}>
              {overallChange > 0 ? "+" : ""}
              {overallChange.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Narrative */}
        <div className={`flex items-start gap-2.5 border rounded-xl px-3.5 py-2.5 ${accentBg}`}>
          <TrendIcon className={`h-4 w-4 shrink-0 mt-0.5 ${accentText}`} />
          <p className="text-[11px] text-slate-700 leading-snug">
            Poverty incidence in <span className="font-bold">{lastActual.region}</span> is projected to{" "}
            <span className={`font-bold ${accentText}`}>{direction}</span> from{" "}
            <span className="font-bold">{lastActual.poverty_incidence}%</span> in {lastActual.year} to{" "}
            <span className="font-bold">{lastPrediction.predicted_poverty_incidence}%</span> by{" "}
            {lastPrediction.year}, a{" "}
            <span className={`font-bold ${accentText}`}>
              {overallChange > 0 ? "+" : ""}
              {overallChange.toFixed(2)} percentage point ({overallPctChange > 0 ? "+" : ""}
              {overallPctChange.toFixed(1)}%)
            </span>{" "}
            change over {lastPrediction.year - lastActual.year} years.
          </p>
        </div>

        {/* Comparison table */}
        <div className="flex-1 overflow-x-auto border border-slate-200 rounded-xl">
          <table className="min-w-full divide-y divide-slate-100 text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3.5 py-2.5 text-left font-bold text-slate-500 uppercase tracking-wider">
                  Year
                </th>
                <th className="px-3.5 py-2.5 text-left font-bold text-slate-500 uppercase tracking-wider">
                  Predicted
                </th>
                <th className="px-3.5 py-2.5 text-left font-bold text-slate-500 uppercase tracking-wider">
                  vs {lastActual.year} ({lastActual.poverty_incidence}%)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.year} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3.5 py-2.5 text-slate-700 font-semibold">{row.year}</td>
                  <td className="px-3.5 py-2.5 text-slate-600 font-medium">{row.predicted}%</td>
                  <td className="px-3.5 py-2.5">
                    <span
                      className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                        row.change > 0
                          ? "bg-red-50 text-red-600"
                          : row.change < 0
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {row.change > 0 ? "+" : ""}
                      {row.change.toFixed(2)} pts ({row.pctChange > 0 ? "+" : ""}
                      {row.pctChange.toFixed(1)}%)
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}