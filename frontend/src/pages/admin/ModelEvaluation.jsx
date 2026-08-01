import { BadgeCheck } from "lucide-react";
import { useModelComparison } from "../../hooks/usePoverty";

import Loader from "../../components/common/Loader";
import MetricsTable from "../../components/admin/Model_evaluation/MetricsTable";
import MetricsBarChart from "../../components/admin/Model_evaluation/MetricsBarChart";

export default function ModelEvaluation() {
  const { data, loading, error } = useModelComparison();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#002366]/10">
          <BadgeCheck className="w-5 h-5 text-[#002366]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#002366] tracking-tight">Model Evaluation</h1>
          <p className="text-xs text-slate-500">
            Compare XGBoost, Ridge, and Random Forest performance
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader />
        </div>
      ) : error ? (
        <div className="text-center text-xs text-slate-400 py-6 border border-dashed border-slate-200 rounded-xl">
          No evaluation results yet. Go to Model Training and train models first.
        </div>
      ) : (
        <>
          {/* Metrics table */}
          <section>
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">
              Metrics Comparison
            </h2>
            <MetricsTable results={data?.results} bestModel={data?.best_model} />
          </section>

          {/* Charts */}
          <section>
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">
              Visual Comparison
            </h2>
            <MetricsBarChart results={data?.results} bestModel={data?.best_model} />
          </section>

          {/* Selection metric note */}
          {data?.selection_metric && (
            <p className="text-xs text-slate-400">
              Best model selected based on lowest{" "}
              <span className="font-medium text-slate-600 uppercase">
                {data.selection_metric}
              </span>
              .
            </p>
          )}
        </>
      )}
    </div>
  );
}