import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

const COLORS = {
  rmse: "#002366",
  mae: "#64748b",
  r2: "#059669",
};

function toChartData(results) {
  return Object.entries(results).map(([name, metrics]) => ({
    name: name.replace("_", " "),
    rmse: metrics.rmse,
    mae: metrics.mae,
    r2: metrics.r2,
  }));
}

export default function MetricsBarChart({ results, bestModel }) {
  if (!results || Object.keys(results).length === 0) return null;

  const data = toChartData(results);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Error metrics: RMSE / MAE (lower is better) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">
          Error Metrics (lower is better)
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} className="capitalize" />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
              formatter={(value) => value.toFixed(4)}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="rmse" fill={COLORS.rmse} name="RMSE" radius={[4, 4, 0, 0]} />
            <Bar dataKey="mae" fill={COLORS.mae} name="MAE" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* R² (higher is better) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">
          R² Score (higher is better)
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} domain={[0, 1]} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
              formatter={(value) => value.toFixed(4)}
            />
            <Bar dataKey="r2" name="R²" radius={[4, 4, 0, 0]}>
              {data.map((entry, idx) => (
                <Cell
                  key={idx}
                  fill={entry.name === bestModel?.replace("_", " ") ? COLORS.r2 : "#cbd5e1"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}