import { useState } from "react";
import { ChartColumnBig, TrendingUp, ArrowLeftRight, CircleDot } from "lucide-react";
import { useTimeline } from "../../hooks/usePoverty";

import Loader from "../../components/common/Loader";
import Modal from "../../components/common/Modal";
import PovertyTimelineChart from "../../components/admin/Visualization/PovertyTimelineChart";
import KpiCards from "../../components/admin/Visualization/KpiCards";

import { MultiIndicatorCharts, MultiIndicatorTable } from "../../components/admin/Visualization/MultiIndicatorChart";
import { YoyChangeBars, YoyChangeTable } from "../../components/admin/Visualization/YoyChangeChart";
import { CorrelationChart, CorrelationTable } from "../../components/admin/Visualization/CorrelationScatter";

const VIEW_BUTTONS = [
  { key: "indicators", label: "Show Indicator Trends", icon: TrendingUp },
  { key: "yoy", label: "Year-over-Year Change", icon: ArrowLeftRight },
  { key: "correlation", label: "Indicator Correlation", icon: CircleDot },
];

export default function Visualization() {
  const { data, loading, error } = useTimeline();
  const [openModal, setOpenModal] = useState(null); // "indicators" | "yoy" | "correlation" | null
  const [correlationIndicator, setCorrelationIndicator] = useState("avg_household_income");

  const actuals = data?.actuals;
  const predictions = data?.predictions;

  return (
    <div className="p-5 max-w-7xl mx-auto space-y-3.5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-[#002366] to-[#003a99] shadow-sm shadow-[#002366]/20">
          <ChartColumnBig className="w-3.5 h-3.5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold text-[#002366] tracking-tight">Visualization</h1>
          <p className="text-[10px] text-slate-500">
            A full visual overview of poverty incidence and its drivers
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader />
        </div>
      ) : error ? (
        <div className="text-center text-xs text-red-500 py-6 border border-dashed border-red-200 rounded-xl">
          {error}
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <KpiCards actuals={actuals} predictions={predictions} />

          {/* Main timeline */}
          <section>
            <h2 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Poverty Incidence Timeline (1997–2026)
            </h2>
            <PovertyTimelineChart actuals={actuals} predictions={predictions} compact />
          </section>

          {/* Buttons that open each chart in a modal -- no previews on this page */}
          <section>
            <h2 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              More Visualizations
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {VIEW_BUTTONS.map((btn) => {
                const Icon = btn.icon;
                return (
                  <button
                    key={btn.key}
                    onClick={() => setOpenModal(btn.key)}
                    className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg
                               px-3 py-2.5 shadow-sm hover:shadow-md hover:border-[#002366]/30
                               active:scale-[0.98] transition-all duration-150"
                  >
                    <div className="flex items-center justify-center w-7 h-7 rounded-md bg-[#002366]/10 shrink-0">
                      <Icon className="w-3.5 h-3.5 text-[#002366]" />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-700 text-left">{btn.label}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </>
      )}

      {/* Modals */}
      <Modal
        isOpen={openModal === "indicators"}
        onClose={() => setOpenModal(null)}
        title="Indicator Trends Over Time"
        subtitle="All 6 socioeconomic indicators, 1997–2023"
        maxWidth="max-w-5xl"
      >
        <MultiIndicatorCharts actuals={actuals} />
        <MultiIndicatorTable actuals={actuals} />
      </Modal>

      <Modal
        isOpen={openModal === "yoy"}
        onClose={() => setOpenModal(null)}
        title="Year-over-Year Change"
        subtitle="Change in poverty incidence compared to the prior year"
        maxWidth="max-w-3xl"
      >
        <YoyChangeBars actuals={actuals} height={300} />
        <YoyChangeTable actuals={actuals} />
      </Modal>

      <Modal
        isOpen={openModal === "correlation"}
        onClose={() => setOpenModal(null)}
        title="Indicator Correlation"
        subtitle="How each indicator relates to poverty incidence"
        maxWidth="max-w-3xl"
      >
        <CorrelationChart
          actuals={actuals}
          selectedIndicator={correlationIndicator}
          onChangeIndicator={setCorrelationIndicator}
          height={300}
        />
        <CorrelationTable actuals={actuals} selectedIndicator={correlationIndicator} />
      </Modal>
    </div>
  );
}