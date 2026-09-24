import { formatPrediction } from "../../../utils/formatPrediction";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";

export default function PredictionsBarChart({ predictions }) {
  if (!predictions || predictions.length === 0) return null;

  const chartData = [...predictions]
    .sort((a, b) => a.year - b.year)
    .map((p) => ({
      year: p.year,
      predicted: p.predicted_poverty_incidence,
    }));

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-3.5">
      <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
        Predicted Poverty Incidence by Year
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="year" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} unit="%" />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #e2e8f0" }}
            formatter={(value) => `${formatPrediction(value)}%`}
          />
          <Bar dataKey="predicted" name="Predicted Poverty Incidence" fill="#002366" radius={[6, 6, 0, 0]}>
            <LabelList dataKey="predicted" position="top" fontSize={11} fill="#002366" formatter={(v) => `${formatPrediction(v)}%`} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
