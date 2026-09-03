import { useMemo } from "react";
import { TrendingUp, TrendingDown, ArrowDownToLine, ArrowUpToLine, Target } from "lucide-react";

export default function KpiCards({ actuals, predictions }) {
  const stats = useMemo(() => {
    if (!actuals || actuals.length === 0) return null;

    const sorted = [...actuals].sort((a, b) => a.year - b.year);
    const withPoverty = sorted.filter((r) => r.poverty_incidence != null);
    const latest = withPoverty[withPoverty.length - 1];

    if (!latest) return null; // no FIES data available at all

    const values = withPoverty.map((r) => r.poverty_incidence);
    const highest = Math.max(...values);
    const lowest = Math.min(...values);
    const highestYear = withPoverty.find((r) => r.poverty_incidence === highest)?.year;
    const lowestYear = withPoverty.find((r) => r.poverty_incidence === lowest)?.year;

    const sortedPredictions = predictions ? [...predictions].sort((a, b) => a.year - b.year) : [];
    const lastPrediction = sortedPredictions[sortedPredictions.length - 1];

    const projectedChange = lastPrediction
      ? lastPrediction.predicted_poverty_incidence - latest.poverty_incidence
      : null;

    return {
      latestYear: latest.year,
      latestValue: latest.poverty_incidence,
      highest,
      highestYear,
      lowest,
      lowestYear,
      lastPredictionYear: lastPrediction?.year,
      lastPredictionValue: lastPrediction?.predicted_poverty_incidence,
      projectedChange,
    };
  }, [actuals, predictions]);

  if (!stats) return null;

  const cards = [
    {
      label: `Latest (${stats.latestYear})`,
      value: `${stats.latestValue}%`,
      icon: Target,
      color: "from-[#002366] to-[#003a99]",
    },
    {
      label: `Historical High (${stats.highestYear})`,
      value: `${stats.highest}%`,
      icon: ArrowUpToLine,
      color: "from-red-500 to-red-600",
    },
    {
      label: `Historical Low (${stats.lowestYear})`,
      value: `${stats.lowest}%`,
      icon: ArrowDownToLine,
      color: "from-emerald-500 to-emerald-600",
    },
    stats.lastPredictionValue != null && {
      label: `Projected (${stats.lastPredictionYear})`,
      value: `${stats.lastPredictionValue}%`,
      subtext:
        stats.projectedChange != null
          ? `${stats.projectedChange > 0 ? "+" : ""}${stats.projectedChange.toFixed(2)} pts vs ${stats.latestYear}`
          : null,
      icon: stats.projectedChange > 0 ? TrendingUp : TrendingDown,
      color: stats.projectedChange > 0 ? "from-orange-500 to-orange-600" : "from-teal-500 to-teal-600",
    },
  ].filter(Boolean);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`bg-gradient-to-br ${card.color} rounded-xl p-3 text-white shadow-md`}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/70">
                {card.label}
              </p>
              <Icon className="w-4 h-4 text-white/60" />
            </div>
            <p className="text-xl font-black leading-none">{card.value}</p>
            {card.subtext && <p className="text-[10px] text-white/70 mt-1.5">{card.subtext}</p>}
          </div>
        );
      })}
    </div>
  );
}