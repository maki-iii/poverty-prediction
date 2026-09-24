import { buildTimeline } from "../../../utils/timeline.js";
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
  const { points: chartData, segments } = useMemo(
    () => buildTimeline(actuals, predictions, "poverty_incidence", "predicted_poverty_incidence", "predicted"),
    [actuals, predictions],
  );

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
            formatter={(value) => value != null ? `${value}%` : "N/A"}
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

          {segments.map((segment) => (
            <Line key={segment.key} dataKey={segment.key} type="linear"
              stroke={segment.kind === "actual" ? "#002366" : segment.kind === "interpolated" ? "#d97706" : "#059669"}
              strokeWidth={2}
              strokeDasharray={segment.kind === "actual" ? undefined : "4 4"}
              dot={false} activeDot={false} legendType="none" tooltipType="none"
              connectNulls={false} isAnimationActive={false}
            />
          ))}
          <Line
            type="monotone"
            dataKey="actual"
            name="Actual Poverty Incidence"
            stroke="#002366"
            strokeWidth={0}
            dot={{ r: 2.5, strokeWidth: 2 }}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="interpolated"
            name="Interpolated"
            stroke="#d97706"
            strokeWidth={0}
            strokeDasharray="3 3"
            dot={{ r: 2, strokeWidth: 2 }}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="predicted"
            name="Predicted Poverty Incidence"
            stroke="#059669"
            strokeWidth={0}
            strokeDasharray="6 6"
            dot={{ r: 3, strokeWidth: 2, fill: "#059669" }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}