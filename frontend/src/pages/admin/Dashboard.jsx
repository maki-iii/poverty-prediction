import { LayoutDashboard } from "lucide-react";
import { useTimeline } from "../../hooks/usePoverty";

import Loader from "../../components/common/Loader";
import KpiCards from "../../components/admin/Visualization/KpiCards";
import PovertyTimelineChart from "../../components/admin/Visualization/PovertyTimelineChart";
import RecentActivity from "../../components/admin/Dashboard/RecentActivity";
import ModelMetricsSummary from "../../components/admin/Dashboard/ModelMetricsSummary";

export default function Dashboard() {
  const { data, loading, error } = useTimeline();

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-2.5">
      {/* Header */}
      <div className="flex items-center gap-1.5">
        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-gradient-to-br from-[#002366] to-[#003a99] shadow-sm shadow-[#002366]/20">
          <LayoutDashboard className="w-3 h-3 text-white" />
        </div>

        <div>
          <h1 className="text-sm font-bold text-[#002366] tracking-tight">
            Dashboard
          </h1>
          <p className="text-[9px] text-slate-500">
            Overview of poverty prediction data, models, and system activity
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader />
        </div>
      ) : error ? (
        <div className="text-center text-xs text-red-500 py-4 border border-dashed border-red-200 rounded-lg">
          {error}
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <KpiCards
            actuals={data?.actuals}
            predictions={data?.predictions}
          />

          {/* Timeline + Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 items-stretch">
            {/* Timeline */}
            <div className="lg:col-span-2 flex flex-col">
              <h2 className="text-[9px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Poverty Incidence Timeline
              </h2>

              <PovertyTimelineChart
                actuals={data?.actuals}
                predictions={data?.predictions}
                compact
              />
            </div>

            {/* Activity */}
            <div className="flex flex-col">
              <h2 className="text-[9px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Activity
              </h2>

              <div className="flex-1">
                <RecentActivity limit={4} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Model metrics summary */}
      <section>
        <h2 className="text-[9px] font-bold text-slate-700 uppercase tracking-wider mb-1">
          Model Performance
        </h2>

        <ModelMetricsSummary />
      </section>
    </div>
  );
}