import { useEffect, useRef, useMemo } from "react";
import { BrainCircuit } from "lucide-react";
import { useLatestPredictions, useTrainingRuns } from "../../hooks/usePoverty";
import useTrainingProgress from "../../hooks/useTrainingProgress";
import PovertyService from "../../services/povertyService";

import Loader from "../../components/common/Loader";
import TrainButton from "../../components/admin/Model_training/TrainButton";
import TrainingStepsList from "../../components/admin/Model_training/TrainingStepsList";
import PredictionsBarChart from "../../components/admin/Model_training/PredictionBarChart";
import PredictionsResultTable from "../../components/admin/Model_training/PredictionsResultTable";

export default function ModelTraining() {
  const { data: predictions, loading, error: fetchError, refetch } = useLatestPredictions();
  const { status: liveStatus, starting, startError, start, isRunning } = useTrainingProgress();
  const { data: latestRuns } = useTrainingRuns(1);

  const hasRefetchedRef = useRef(false);

  const handleTrain = async () => {
    hasRefetchedRef.current = false;
    await start(PovertyService.runTrainAndEvaluate);
  };

  useEffect(() => {
    if (liveStatus?.status === "completed" && !hasRefetchedRef.current) {
      hasRefetchedRef.current = true;
      refetch();
    }
  }, [liveStatus, refetch]);

  const displayStatus = useMemo(() => {
    if (liveStatus) return liveStatus;

    const lastRun = latestRuns?.[0];
    if (!lastRun) return null;

    if (lastRun.status === "completed") {
      return {
        status: "completed",
        step: "finalizing",
        progress: 100,
        message: `Training complete. Best model: ${lastRun.best_model}`,
        best_model: lastRun.best_model,
      };
    }
    if (lastRun.status === "failed") {
      return {
        status: "failed",
        step: "finalizing",
        progress: 0,
        message: lastRun.error_message || "Training failed.",
      };
    }
    return null;
  }, [liveStatus, latestRuns]);

  const showChart = displayStatus?.status === "completed" && predictions && predictions.length > 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-[#002366] to-[#003a99] shadow-md shadow-[#002366]/20">
            <BrainCircuit className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#002366] tracking-tight">Model Training</h1>
            <p className="text-[11px] text-slate-500">
              Train and compare models, then predict poverty incidence
            </p>
          </div>
        </div>
        <TrainButton onTrain={handleTrain} training={starting || isRunning} />
      </div>

      {startError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
          <p className="text-xs text-red-600">{startError}</p>
        </div>
      )}

      {/* Stepper -- reflects either live progress or the last completed run */}
      <TrainingStepsList status={displayStatus} />

      {/* Bar chart, shown whenever the latest known run is completed */}
      {showChart && <PredictionsBarChart predictions={predictions} />}

      {/* Results table */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Predictions
          </h2>
          <span className="text-[11px] text-slate-400">({predictions?.length || 0})</span>
        </div>
        {loading ? (
          <div className="flex justify-center py-5">
            <Loader />
          </div>
        ) : fetchError ? (
          <div className="text-center text-xs text-slate-400 py-5 border border-dashed border-slate-200 rounded-xl">
            No predictions yet. Click "Train Models" to generate them.
          </div>
        ) : (
          <PredictionsResultTable predictions={predictions} />
        )}
      </section>
    </div>
  );
}