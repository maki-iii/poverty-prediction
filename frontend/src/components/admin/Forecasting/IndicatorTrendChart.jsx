import { buildTimeline } from "../../../utils/timeline.js";
import { useState, useMemo } from "react";
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

const INDICATORS = [
  { key: "avg_household_income", label: "Household Income" },
  { key: "avg_household_expenditure", label: "Household Expenditure" },
  { key: "avg_family_size", label: "Family Size" },
  { key: "inflation_rate", label: "Inflation Rate (%)" },
];

export default function IndicatorTrendChart({ actuals, forecasts }) {
  const [selectedIndicator, setSelectedIndicator] = useState(INDICATORS[0].key);

  const { points: chartData, segments } = useMemo(
    () => buildTimeline(actuals, forecasts, selectedIndicator, selectedIndicator, "forecast"),
    [actuals, forecasts, selectedIndicator],
  );

  const firstForecastYear = forecasts?.[0]?.year;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
          Historical Trend + Forecast
        </p>
        <select
          value={selectedIndicator}
          onChange={(e) => setSelectedIndicator(e.target.value)}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700
                     focus:outline-none focus:ring-2 focus:ring-[#002366]/30 focus:border-[#002366]"
        >
          {INDICATORS.map((ind) => (
            <option key={ind.key} value={ind.key}>
              {ind.label}
            </option>
          ))}
        </select>
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="year" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />

          {firstForecastYear && (
            <ReferenceLine
              x={firstForecastYear}
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
            name="Actual"
            stroke="#002366"
            strokeWidth={0}
            dot={{ r: 2, strokeWidth: 2 }}
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
            dataKey="forecast"
            name="Forecast"
            stroke="#059669"
            strokeWidth={0}
            strokeDasharray="5 5"
            dot={{ r: 2, strokeWidth: 2 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}