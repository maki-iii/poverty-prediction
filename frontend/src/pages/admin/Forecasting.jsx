import { TrendingUp } from "lucide-react";
import { useTimeline, useLatestForecasts, usePipelineActions } from "../../hooks/usePoverty";

import Loader from "../../components/common/Loader";
import ForecastButton from "../../components/admin/Forecasting/ForecastingButton";
import ForecastResultTable from "../../components/admin/Forecasting/ForecastingResultTable";
import IndicatorTrendChart from "../../components/admin/Forecasting/IndicatorTrendChart";

export default function Forecasting() {
  const { data: timeline, loading: actualsLoading, refetch: refetchTimeline } = useTimeline();
  const actuals = timeline?.actuals;
  const { data: forecasts, loading: forecastsLoading, error: forecastsError, refetch } =
    useLatestForecasts();
  const { runForecast, running, error: pipelineError } = usePipelineActions();

  const handleRunForecast = async () => {
    try {
      await runForecast();
      await Promise.all([refetch(), refetchTimeline()]);
    } catch {
      // The action hook exposes errors below; cancellation also rejects the request.
    }
  };

  const isLoading = actualsLoading || forecastsLoading;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#002366]/10">
            <TrendingUp className="w-5 h-5 text-[#002366]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#002366] tracking-tight">Forecasting</h1>
            <p className="text-xs text-slate-500">
              Forecasts for the three years after the latest actual or interpolated year
            </p>
          </div>
        </div>
        <ForecastButton onRun={handleRunForecast} running={running} />
      </div>

      {pipelineError && pipelineError !== "canceled" && (
        <p role="alert" className="text-sm text-red-600">{pipelineError}</p>
      )}
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader />
        </div>
      ) : (
        <>
          {/* Chart */}
          <section>
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">
              Trend Visualization
            </h2>
            <IndicatorTrendChart actuals={actuals} forecasts={timeline?.forecasts} />
          </section>

          {/* Table */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                Forecasted Values
              </h2>
              <span className="text-xs text-slate-400">({forecasts?.length || 0})</span>
            </div>
            {forecastsError ? (
              <div className="text-center text-xs text-slate-400 py-6 border border-dashed border-slate-200 rounded-xl">
                No forecasts yet. Click "Run Forecast" to generate them.
              </div>
            ) : (
              <ForecastResultTable forecasts={forecasts} />
            )}
          </section>
        </>
      )}
    </div>
  );
}
