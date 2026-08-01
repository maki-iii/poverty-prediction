import { useEffect, useRef } from "react";
import { BrainCircuit } from "lucide-react";
import { useLatestPredictions } from "../../hooks/usePoverty";
import useTrainingProgress from "../../hooks/useTrainingProgress";
import PovertyService from "../../services/povertyService";

import Loader from "../../components/common/Loader";
import TrainButton from "../../components/admin/Model_training/TrainButton";
import TrainingProgressBar from "../../components/admin/Model_training/TrainingProgressBar";
import PredictionsResultTable from "../../components/admin/Model_training/PredictionsResultTable";

export default function ModelTraining() {
  const { data: predictions, loading, error: fetchError, refetch } = useLatestPredictions();
  const { status, starting, startError, start, isRunning } = useTrainingProgress();

  const hasRefetchedRef = useRef(false);

  const handleTrain = async () => {
    hasRefetchedRef.current = false;
    await start(PovertyService.runTrainAndEvaluate);
  };

  // Refetch predictions exactly once when training finishes successfully
  useEffect(() => {
    if (status?.status === "completed" && !hasRefetchedRef.current) {
      hasRefetchedRef.current = true;
      refetch();
    }
  }, [status, refetch]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#002366]/10">
            <BrainCircuit className="w-5 h-5 text-[#002366]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#002366] tracking-tight">Model Training</h1>
            <p className="text-xs text-slate-500">
              Train and compare models, then predict poverty incidence
            </p>
          </div>
        </div>
        <TrainButton onTrain={handleTrain} training={starting || isRunning} />
      </div>

      {startError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="text-sm text-red-600">{startError}</p>
        </div>
      )}

      <TrainingProgressBar status={status} />

      {/* Results */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
            Predictions
          </h2>
          <span className="text-xs text-slate-400">({predictions?.length || 0})</span>
        </div>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader />
          </div>
        ) : fetchError ? (
          <div className="text-center text-xs text-slate-400 py-6 border border-dashed border-slate-200 rounded-xl">
            No predictions yet. Click "Train Models" to generate them.
          </div>
        ) : (
          <PredictionsResultTable predictions={predictions} />
        )}
      </section>
    </div>
  );
}