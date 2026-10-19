import { formatNumber } from "../../../utils/formatNumber.js";
import { useState, useMemo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
} from "recharts";

const INDICATORS = [
  { key: "avg_household_income", label: "Household Income" },
  { key: "avg_household_expenditure", label: "Household Expenditure" },
  { key: "avg_family_size", label: "Family Size" },
];

function correlation(xs, ys) {
  const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const denom = Math.sqrt(denX * denY);
  return denom === 0 ? 0 : num / denom;
}

function useCorrelationData(actuals, selectedIndicator) {
  return useMemo(() => {
    if (!actuals || actuals.length === 0) return { chartData: [], r: 0 };

    const points = actuals.map((row) => ({
      x: row[selectedIndicator],
      y: row.poverty_incidence,
      year: row.year,
    }));

    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);

    return { chartData: points, r: correlation(xs, ys) };
  }, [actuals, selectedIndicator]);
}

export function CorrelationChart({ actuals, selectedIndicator, onChangeIndicator, height = 260 }) {
  const { chartData, r } = useCorrelationData(actuals, selectedIndicator);
  const indicatorLabel = INDICATORS.find((i) => i.key === selectedIndicator)?.label;

  const strengthLabel =
    Math.abs(r) >= 0.7 ? "Strong" : Math.abs(r) >= 0.4 ? "Moderate" : Math.abs(r) >= 0.2 ? "Weak" : "Very Weak";
  const directionLabel = r > 0 ? "positive" : "negative";

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
          Indicator vs. Poverty Incidence
        </p>
        <select
          value={selectedIndicator}
          onChange={(e) => onChangeIndicator(e.target.value)}
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

      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis tickFormatter={formatNumber}
            type="number"
            dataKey="x"
            name={indicatorLabel}
            tick={{ fontSize: 11 }}
            label={{ value: indicatorLabel, position: "insideBottom", offset: -5, fontSize: 10, fill: "#94a3b8" }}
          />
          <YAxis tickFormatter={formatNumber} type="number" dataKey="y" name="Poverty Incidence" tick={{ fontSize: 11 }} />
          <ZAxis range={[60, 60]} />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #e2e8f0" }}
            formatter={(value, name) => (name === "Poverty Incidence" ? `${formatNumber(value)}%` : formatNumber(value))}
            labelFormatter={() => ""}
          />
          <Scatter data={chartData} fill="#002366" />
        </ScatterChart>
      </ResponsiveContainer>

      <div className="mt-3 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
        <p className="text-[11px] text-slate-600">
          Correlation coefficient: <span className="font-bold text-slate-800">{formatNumber(r)}</span> —{" "}
          <span className="font-semibold">{strengthLabel} {directionLabel}</span> relationship
        </p>
      </div>
    </>
  );
}

export function CorrelationTable({ actuals, selectedIndicator }) {
  const { chartData } = useCorrelationData(actuals, selectedIndicator);
  const indicatorLabel = INDICATORS.find((i) => i.key === selectedIndicator)?.label;

  if (chartData.length === 0) return null;

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-xl mt-4">
      <table className="min-w-full divide-y divide-slate-100 text-xs">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">
              Year
            </th>
            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">
              {indicatorLabel}
            </th>
            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">
              Poverty Incidence
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {[...chartData]
            .sort((a, b) => a.year - b.year)
            .map((row) => (
              <tr key={row.year} className="hover:bg-slate-50 transition-colors">
                <td className="px-3 py-2 text-slate-700 font-medium">{row.year}</td>
                <td className="px-3 py-2 text-slate-600">{row.x}</td>
                <td className="px-3 py-2 text-slate-600">{row.y}%</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

// Compact preview version for the main page
export default function CorrelationScatter({ actuals }) {
  const [selectedIndicator, setSelectedIndicator] = useState(INDICATORS[0].key);
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
      <CorrelationChart
        actuals={actuals}
        selectedIndicator={selectedIndicator}
        onChangeIndicator={setSelectedIndicator}
      />
    </div>
  );
}
