import { useState } from "react";
import { ChartColumnBig, Maximize2 } from "lucide-react";
import { useTimeline } from "../../hooks/usePoverty";

import Loader from "../../components/common/Loader";
import Modal from "../../components/common/Modal";
import PovertyTimelineChart from "../../components/admin/Visualization/PovertyTimelineChart";
import KpiCards from "../../components/admin/Visualization/KpiCards";

import MultiIndicatorChart, {
  MultiIndicatorCharts,
  MultiIndicatorTable,
} from "../../components/admin/Visualization/MultiIndicatorChart";
import YoyChangeChart, {
  YoyChangeBars,
  YoyChangeTable,
} from "../../components/admin/Visualization/YoyChangeChart";
import CorrelationScatter, {
  CorrelationChart,
  CorrelationTable,
} from "../../components/admin/Visualization/CorrelationScatter";

function ViewDetailsButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-[11px] font-semibold text-[#002366] hover:text-[#001a4d] transition-colors"
    >
      <Maximize2 className="w-3 h-3" />
      View Details
    </button>
  );
}

export default function Visualization() {
  const { data, loading, error } = useTimeline();
  const [openModal, setOpenModal] = useState(null); // "indicators" | "yoy" | "correlation" | null
  const [correlationIndicator, setCorrelationIndicator] = useState("avg_household_income");

  const actuals = data?.actuals;
  const predictions = data?.predictions;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-[#002366] to-[#003a99] shadow-md shadow-[#002366]/20">
          <ChartColumnBig className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-[#002366] tracking-tight">Visualization</h1>
          <p className="text-[11px] text-slate-500">
            A full visual overview of poverty incidence and its drivers
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader />
        </div>
      ) : error ? (
        <div className="text-center text-xs text-red-500 py-8 border border-dashed border-red-200 rounded-xl">
          {error}
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <KpiCards actuals={actuals} predictions={predictions} />

          {/* Main timeline */}
          <section>
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Poverty Incidence Timeline (1997–2026)
            </h2>
            <PovertyTimelineChart actuals={actuals} predictions={predictions} />
          </section>

          {/* Indicator trends -- compact preview + modal trigger */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Indicator Trends Over Time
              </p>
              <ViewDetailsButton onClick={() => setOpenModal("indicators")} />
            </div>
            <MultiIndicatorCharts actuals={actuals} />
          </div>

          {/* YoY change + correlation, side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Year-over-Year Change
                </p>
                <ViewDetailsButton onClick={() => setOpenModal("yoy")} />
              </div>
              <YoyChangeBars actuals={actuals} height={200} />
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Indicator Correlation
                </p>
                <ViewDetailsButton onClick={() => setOpenModal("correlation")} />
              </div>
              <CorrelationChart
                actuals={actuals}
                selectedIndicator={correlationIndicator}
                onChangeIndicator={setCorrelationIndicator}
                height={200}
              />
            </div>
          </div>
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