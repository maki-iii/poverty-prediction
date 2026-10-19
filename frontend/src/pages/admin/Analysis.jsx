import { Map, Sparkles } from "lucide-react";
import { useTimeline, useLatestPredictions, useFeatureImportance } from "../../hooks/usePoverty";

import Loader from "../../components/common/Loader";
import FeatureImportanceCard from "../../components/admin/Analysis/FeatureImportanceCard";
import PredictionsTrendCard from "../../components/admin/Analysis/PredictionsTrendCard";

export default function Analysis() {
  const { data: timeline, loading: actualsLoading } = useTimeline();
  const actuals = timeline?.actuals;
  const { data: predictions, loading: predictionsLoading, error: predictionsError } =
    useLatestPredictions();
  const { data: importanceData, loading: importanceLoading, error: importanceError } =
    useFeatureImportance();

  const isLoading = actualsLoading || predictionsLoading || importanceLoading;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#002366] to-[#003a99] shadow-md shadow-[#002366]/20">
          <Map className="w-4.5 h-4.5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-xl font-bold text-[#002366] tracking-tight">Analysis</h1>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xs text-slate-500">
            What drives the model, and where poverty incidence is headed
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
          <section className="flex flex-col">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
              Feature Importance
            </h2>
            {importanceError ? (
              <div className="flex-1 flex items-center justify-center text-xs text-red-500 py-6 border border-dashed border-red-200 rounded-xl min-h-[460px]">
                {importanceError}
              </div>
            ) : (
              <FeatureImportanceCard data={importanceData} />
            )}
          </section>

          <section className="flex flex-col">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
              Prediction Trend
            </h2>
            {predictionsError ? (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-400 py-6 border border-dashed border-slate-200 rounded-xl min-h-[460px]">
                No predictions found. Run predictions first.
              </div>
            ) : (
              <PredictionsTrendCard actuals={actuals} predictions={predictions} />
            )}
          </section>
        </div>
      )}
    </div>
  );
}
