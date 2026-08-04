import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

export default function PovertyTimelineChart({ actuals, predictions, compact = false }) {
  const chartData = useMemo(() => {
    if (!actuals || actuals.length === 0) return [];

    const sortedActuals = [...actuals].sort((a, b) => a.year - b.year);
    const sortedPredictions = predictions ? [...predictions].sort((a, b) => a.year - b.year) : [];

    const actualPoints = sortedActuals.map((row) => ({
      year: row.year,
      actual: row.poverty_incidence,
      predicted: null,
    }));

    if (sortedPredictions.length === 0) return actualPoints;

    // Bridge the last actual year to the first prediction so the line
    // connects visually instead of showing a break.
    const lastActual = actualPoints[actualPoints.length - 1];
    const bridgedLast = { ...lastActual, predicted: lastActual.actual };

    const predictionPoints = sortedPredictions.map((row) => ({
      year: row.year,
      actual: null,
      predicted: row.predicted_poverty_incidence,
    }));

    return [...actualPoints.slice(0, -1), bridgedLast, ...predictionPoints];
  }, [actuals, predictions]);

  const firstPredictionYear = predictions?.[0]?.year;

  if (chartData.length === 0) {
    return (
      <div className="text-center text-xs text-slate-400 py-10 border border-dashed border-slate-200 rounded-xl">
        No data available yet.
      </div>
    );
  }

  return (
    <div className={`bg-white border border-slate-200 rounded-xl shadow-sm ${compact ? "p-3.5" : "p-5"}`}>
      <ResponsiveContainer width="100%" height={compact ? 350 : 450}>
        <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="year" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} unit="%" />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #e2e8f0" }}
            formatter={(value) => (value != null ? `${value}%` : "—")}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />

          {firstPredictionYear && (
            <ReferenceLine
              x={firstPredictionYear}
              stroke="#cbd5e1"
              strokeDasharray="4 4"
              label={{ value: "Forecast starts", fontSize: 10, fill: "#94a3b8", position: "top" }}
            />
          )}

          <Line
            type="monotone"
            dataKey="actual"
            name="Actual Poverty Incidence"
            stroke="#002366"
            strokeWidth={2.5}
            dot={{ r: 2.5 }}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="predicted"
            name="Predicted Poverty Incidence"
            stroke="#059669"
            strokeWidth={2.5}
            strokeDasharray="6 6"
            dot={{ r: 3 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}