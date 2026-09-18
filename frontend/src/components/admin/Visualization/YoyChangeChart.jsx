import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

function useYoyData(actuals) {
  return useMemo(() => {
    if (!actuals) return [];

    const sorted = [...actuals]
      .filter((r) => r.poverty_incidence != null) // skip years without a real/interpolated value
      .sort((a, b) => a.year - b.year);

    if (sorted.length < 2) return [];

    const changes = [];
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      changes.push({
        year: curr.year,
        prevYear: prev.year,
        prevValue: prev.poverty_incidence,
        currValue: curr.poverty_incidence,
        change: parseFloat((curr.poverty_incidence - prev.poverty_incidence).toFixed(2)),
      });
    }

    return changes;
  }, [actuals]);
}

// Custom dot: colored by direction of change (red = increase, green = decrease, gray = flat)
function ChangeDot(props) {
  const { cx, cy, payload } = props;
  const color = payload.change > 0 ? "#dc2626" : payload.change < 0 ? "#059669" : "#94a3b8";
  return <circle cx={cx} cy={cy} r={4} fill={color} stroke="#fff" strokeWidth={1.5} />;
}

export function YoyChangeBars({ actuals, height = 260 }) {
  const chartData = useYoyData(actuals);
  if (chartData.length === 0) return null;

  return (
    <>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="year" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} unit=" pts" />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #e2e8f0" }}
            formatter={(value) => `${value > 0 ? "+" : ""}${value} pts`}
          />
          <ReferenceLine y={0} stroke="#cbd5e1" />
          <Line
            type="monotone"
            dataKey="change"
            stroke="#94a3b8"
            strokeWidth={2}
            dot={<ChangeDot />}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-[10px] text-slate-400 mt-2">
        Red = poverty incidence increased from prior year · Green = decreased
      </p>
    </>
  );
}

export function YoyChangeTable({ actuals }) {
  const chartData = useYoyData(actuals);
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
              Previous
            </th>
            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">
              Current
            </th>
            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">
              Change
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {chartData.map((row) => (
            <tr key={row.year} className="hover:bg-slate-50 transition-colors">
              <td className="px-3 py-2 text-slate-700 font-medium">{row.year}</td>
              <td className="px-3 py-2 text-slate-500">
                {row.prevValue}% ({row.prevYear})
              </td>
              <td className="px-3 py-2 text-slate-600">{row.currValue}%</td>
              <td className="px-3 py-2">
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    row.change > 0
                      ? "bg-red-50 text-red-600"
                      : row.change < 0
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {row.change > 0 ? "+" : ""}
                  {row.change} pts
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Compact preview version for the main page
export default function YoyChangeChart({ actuals }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
      <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
        Year-over-Year Change in Poverty Incidence
      </p>
      <YoyChangeBars actuals={actuals} />
    </div>
  );
}