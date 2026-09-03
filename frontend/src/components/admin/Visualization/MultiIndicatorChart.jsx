import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const INDICATORS = [
  { key: "avg_household_income", label: "Household Income", color: "#002366", unit: "" },
  { key: "avg_household_expenditure", label: "Household Expenditure", color: "#0044cc", unit: "" },
  { key: "avg_family_size", label: "Family Size", color: "#7c3aed", unit: "" },
  { key: "inflation_rate", label: "Inflation Rate", color: "#dc2626", unit: "%" },
];

export function MultiIndicatorCharts({ actuals }) {
  const sortedActuals = useMemo(() => {
    if (!actuals) return [];
    return [...actuals].sort((a, b) => a.year - b.year);
  }, [actuals]);

  if (sortedActuals.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {INDICATORS.map((ind) => (
        <div key={ind.key} className="border border-slate-100 rounded-lg p-3">
          <p className="text-[11px] font-semibold text-slate-600 mb-1.5">{ind.label}</p>
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={sortedActuals} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
              <XAxis dataKey="year" hide />
              <YAxis hide domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0" }}
                formatter={(value) => `${value}${ind.unit}`}
                labelFormatter={(label) => `Year ${label}`}
              />
              <Line type="monotone" dataKey={ind.key} stroke={ind.color} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ))}
    </div>
  );
}

export function MultiIndicatorTable({ actuals }) {
  const sortedActuals = useMemo(() => {
    if (!actuals) return [];
    return [...actuals].sort((a, b) => a.year - b.year);
  }, [actuals]);

  if (sortedActuals.length === 0) return null;

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-xl mt-4">
      <table className="min-w-full divide-y divide-slate-100 text-xs">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">
              Year
            </th>
            {INDICATORS.map((ind) => (
              <th key={ind.key} className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">
                {ind.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sortedActuals.map((row) => (
            <tr key={row.year} className="hover:bg-slate-50 transition-colors">
              <td className="px-3 py-2 text-slate-700 font-medium">{row.year}</td>
              {INDICATORS.map((ind) => (
                <td key={ind.key} className="px-3 py-2 text-slate-600 whitespace-nowrap">
                  {row[ind.key]}
                  {ind.unit}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Compact preview version for the main page -- just the mini charts, no table
export default function MultiIndicatorChart({ actuals }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
      <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
        Indicator Trends Over Time
      </p>
      <MultiIndicatorCharts actuals={actuals} />
    </div>
  );
}