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

  const chartData = useMemo(() => {
    if (!actuals) return [];

    const actualPoints = actuals.map((row) => ({
      year: row.year,
      actual: row[selectedIndicator],
      forecast: null,
    }));

    if (!forecasts || forecasts.length === 0) return actualPoints;

    // Bridge the gap: connect the last actual year to the first forecast
    // year so the line doesn't have a visual break.
    const lastActual = actualPoints[actualPoints.length - 1];
    const bridgePoint = lastActual
      ? { year: lastActual.year, actual: lastActual.actual, forecast: lastActual.actual }
      : null;

    const forecastPoints = forecasts.map((row) => ({
      year: row.year,
      actual: null,
      forecast: row[selectedIndicator],
    }));

    return bridgePoint ? [...actualPoints, ...forecastPoints] : [...actualPoints, ...forecastPoints];
  }, [actuals, forecasts, selectedIndicator]);

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

          <Line
            type="monotone"
            dataKey="actual"
            name="Actual"
            stroke="#002366"
            strokeWidth={2}
            dot={{ r: 2 }}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="forecast"
            name="Forecast"
            stroke="#059669"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ r: 2 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}