import { formatNumber } from "../../../utils/formatNumber.js";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Lightbulb, Target } from "lucide-react";

const FEATURE_LABELS = {
  avg_household_income: "Household Income",
  avg_household_expenditure: "Household Expenditure",
  avg_family_size: "Family Size",
};

export default function FeatureImportanceCard({ data }) {
  if (!data) return null;

  const chartData = Object.entries(data.importances).map(([key, value]) => ({
    name: FEATURE_LABELS[key] || key,
    importance: value,
    isTop: key === data.top_feature,
  }));

  const runnerUp = chartData[1];

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col min-h-[460px]">
      <div className="h-1 w-full bg-gradient-to-r from-[#002366] to-[#0044cc]" />

      <div className="p-4 flex-1 flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#002366]/10">
              <Target className="w-4 h-4 text-[#002366]" />
            </div>
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Indicator Importance
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#002366]/10 text-[#002366] capitalize">
            {data.model_used?.replace("_", " ")}
          </span>
        </div>

        {/* Hero stat */}
        <div className="bg-gradient-to-br from-[#002366] to-[#003a99] rounded-xl p-4 text-white shadow-md shadow-[#002366]/20">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/70 mb-1">
            Top Contributing Indicator
          </p>
          <div className="flex items-end justify-between">
            <p className="text-base font-bold leading-tight">
              {FEATURE_LABELS[data.top_feature] || data.top_feature}
            </p>
            <p className="text-3xl font-black leading-none">
              {formatNumber(data.top_feature_pct)}
              <span className="text-base">%</span>
            </p>
          </div>
          {runnerUp && (
            <p className="text-[11px] text-white/60 mt-1.5">
              Next closest: <span className="font-semibold text-white/90">{runnerUp.name}</span> at{" "}
              {formatNumber(runnerUp.importance * 100)}%
            </p>
          )}
        </div>

        {/* Chart */}
        <div className="flex-1">
          <ResponsiveContainer width="100%" height={225}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis tickFormatter={formatNumber} type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={130} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                formatter={(value) => formatNumber(value)}
              />
              <Bar dataKey="importance" radius={[0, 5, 5, 0]}>
                {chartData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.isTop ? "#002366" : "#dbe4f5"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Written insight */}
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5">
          <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-amber-100 shrink-0">
            <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <p className="text-[11px] text-amber-800 leading-snug">
            <span className="font-bold">{FEATURE_LABELS[data.top_feature] || data.top_feature}</span> is
            the strongest driver of poverty incidence predictions, accounting for{" "}
            <span className="font-bold">{formatNumber(data.top_feature_pct)}%</span> of the model's decision-making —
            far more influence than any other indicator.
          </p>
        </div>
      </div>
    </div>
  );
}
