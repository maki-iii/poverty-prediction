import { useEffect, useMemo, useState } from "react";
import {
  RefreshCw,
  AlertCircle,
  TrendingUp,
  MapPin,
  Calendar,
} from "lucide-react";

import { getRegionalData, getPredictions, getForecast } from "../../api/mlAPI";
import { Alert } from "../../components/common/Alert";
import Loader from "../../components/common/Loader";

const TYPE_CONFIG = {
  actual: {
    label: "Actual Data",
    color: "#2563eb",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    dash: "",
  },
  predicted: {
    label: "Predicted Data",
    color: "#059669",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dash: "",
  },
  forecasted: {
    label: "Forecasted Data",
    color: "#d97706",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dash: "7 4",
  },
};

function formatNumber(value, digits = 2) {
  const num = Number(value);
  if (Number.isNaN(num)) return "—";
  return num.toFixed(digits);
}

function getActualValue(row) {
  return Number(row.poverty_incidence || row.actual_poverty_incidence || 0);
}

function getPredictedValue(row) {
  return Number(
    row.predicted_poverty_incidence ||
      row.regression_predicted_poverty_incidence ||
      row.poverty_incidence ||
      0
  );
}

function getForecastValue(row) {
  return Number(
    row.arima_forecast_poverty_incidence ||
      row.forecast_poverty_incidence ||
      row.poverty_incidence ||
      0
  );
}

function AnimatedLineChart({ data, region }) {
  const [hovered, setHovered] = useState(null);

  const WIDTH = 1500;
  const HEIGHT = 360;
  const PAD_LEFT = 56;
  const PAD_RIGHT = 28;
  const PAD_TOP = 24;
  const PAD_BOTTOM = 42;

  const chart = useMemo(() => {
    if (!data.length) {
      return {
        years: [],
        pointsByType: {},
        minValue: 0,
        maxValue: 100,
        yTicks: [],
      };
    }

    const years = [...new Set(data.map((item) => item.year))].sort(
      (a, b) => a - b
    );

    const values = data
      .map((item) => item.value)
      .filter((value) => !Number.isNaN(value));

    const minValue = Math.max(0, Math.floor(Math.min(...values) - 3));
    const maxValue = Math.min(100, Math.ceil(Math.max(...values) + 3));

    const step = maxValue - minValue <= 15 ? 3 : 5;
    const yTicks = [];

    for (
      let value = Math.ceil(minValue / step) * step;
      value <= maxValue;
      value += step
    ) {
      yTicks.push(value);
    }

    const pointsByType = {
      actual: [],
      predicted: [],
      forecasted: [],
    };

    data.forEach((item) => {
      if (pointsByType[item.type]) {
        pointsByType[item.type].push(item);
      }
    });

    Object.keys(pointsByType).forEach((type) => {
      pointsByType[type].sort((a, b) => a.year - b.year);
    });

    return {
      years,
      pointsByType,
      minValue,
      maxValue,
      yTicks,
    };
  }, [data]);

  const innerWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const innerHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const getX = (year) => {
    if (chart.years.length <= 1) return PAD_LEFT + innerWidth / 2;

    const minYear = chart.years[0];
    const maxYear = chart.years[chart.years.length - 1];

    return PAD_LEFT + ((year - minYear) / (maxYear - minYear)) * innerWidth;
  };

  const getY = (value) => {
    if (chart.maxValue === chart.minValue) {
      return PAD_TOP + innerHeight / 2;
    }

    return (
      PAD_TOP +
      innerHeight -
      ((value - chart.minValue) / (chart.maxValue - chart.minValue)) *
        innerHeight
    );
  };

  const buildPath = (items) => {
    return items
      .map((item, index) => {
        const x = getX(item.year).toFixed(2);
        const y = getY(item.value).toFixed(2);
        return `${index === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  };

  const latestPoint = useMemo(() => {
    if (!data.length) return null;
    return [...data].sort((a, b) => b.year - a.year)[0];
  }, [data]);

  if (!data.length) {
    return (
      <div className="h-72 flex items-center justify-center text-xs text-slate-400">
        No chart data available for this region.
      </div>
    );
  }

  return (
    <div className="relative overflow-x-auto">
      <style>
        {`
          .forecast-line {
            stroke-dasharray: 2000;
            stroke-dashoffset: 2000;
            animation: drawLine 1.2s ease forwards;
          }

          .forecast-dot {
            opacity: 0;
            transform-origin: center;
            animation: popDot .35s ease forwards;
          }

          @keyframes drawLine {
            to {
              stroke-dashoffset: 0;
            }
          }

          @keyframes popDot {
            from {
              opacity: 0;
              transform: scale(0.5);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
        `}
      </style>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="block min-w-[1500px] h-[360px]"
      >
        <defs>
          <linearGradient id="forecastBg" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#eff6ff" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
        </defs>

        <rect
          x={PAD_LEFT}
          y={PAD_TOP}
          width={innerWidth}
          height={innerHeight}
          rx="12"
          fill="url(#forecastBg)"
        />

        {chart.yTicks.map((tick) => {
          const y = getY(tick);

          return (
            <g key={tick}>
              <line
                x1={PAD_LEFT}
                x2={WIDTH - PAD_RIGHT}
                y1={y}
                y2={y}
                stroke="#e2e8f0"
                strokeWidth="1"
              />
              <text
                x={PAD_LEFT - 10}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                fill="#94a3b8"
              >
                {tick}%
              </text>
            </g>
          );
        })}

        {chart.years
          .filter(
            (year) =>
              year % 5 === 0 ||
              year === chart.years[0] ||
              year === chart.years.at(-1)
          )
          .map((year) => (
            <text
              key={year}
              x={getX(year)}
              y={HEIGHT - 15}
              textAnchor="middle"
              fontSize="11"
              fill="#64748b"
              fontWeight="500"
            >
              {year}
            </text>
          ))}

        <line
          x1={PAD_LEFT}
          x2={PAD_LEFT}
          y1={PAD_TOP}
          y2={HEIGHT - PAD_BOTTOM}
          stroke="#cbd5e1"
          strokeWidth="1"
        />

        <line
          x1={PAD_LEFT}
          x2={WIDTH - PAD_RIGHT}
          y1={HEIGHT - PAD_BOTTOM}
          y2={HEIGHT - PAD_BOTTOM}
          stroke="#cbd5e1"
          strokeWidth="1"
        />

        {hovered && (
          <line
            x1={getX(hovered.year)}
            x2={getX(hovered.year)}
            y1={PAD_TOP}
            y2={HEIGHT - PAD_BOTTOM}
            stroke="#64748b"
            strokeWidth="1"
            strokeDasharray="4 3"
          />
        )}

        {Object.entries(TYPE_CONFIG).map(([type, config]) => {
          const points = chart.pointsByType[type] || [];

          if (!points.length) return null;

          return (
            <path
              key={`line-${type}`}
              className="forecast-line"
              d={buildPath(points)}
              fill="none"
              stroke={config.color}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={config.dash}
            />
          );
        })}

        {/* Connector lines between actual → predicted → forecasted */}
        {(() => {
          const actualPoints = chart.pointsByType.actual || [];
          const predictedPoints = chart.pointsByType.predicted || [];
          const forecastedPoints = chart.pointsByType.forecasted || [];

          const lastActual = actualPoints[actualPoints.length - 1];
          const firstPredicted = predictedPoints[0];

          const lastPredicted = predictedPoints[predictedPoints.length - 1];
          const firstForecasted = forecastedPoints[0];

          const connectors = [];

          if (lastActual && firstPredicted) {
            connectors.push({
              key: "actual-predicted",
              from: lastActual,
              to: firstPredicted,
            });
          }

          if (lastPredicted && firstForecasted) {
            connectors.push({
              key: "predicted-forecasted",
              from: lastPredicted,
              to: firstForecasted,
            });
          }

          return connectors.map((line) => (
            <line
              key={line.key}
              x1={getX(line.from.year)}
              y1={getY(line.from.value)}
              x2={getX(line.to.year)}
              y2={getY(line.to.value)}
              stroke="#64748b"
              strokeWidth="2"
              strokeDasharray="5 4"
              strokeLinecap="round"
            />
          ));
        })()}

        {Object.entries(TYPE_CONFIG).map(([type, config]) =>
          (chart.pointsByType[type] || []).map((point, index) => {
            const x = getX(point.year);
            const y = getY(point.value);
            const isHovered =
              hovered?.type === type && hovered?.year === point.year;

            return (
              <g key={`dot-${type}-${point.year}-${index}`}>
                <circle
                  className="forecast-dot"
                  cx={x}
                  cy={y}
                  r={isHovered ? 6 : 4.5}
                  fill={config.color}
                  stroke="#ffffff"
                  strokeWidth="2"
                  style={{ animationDelay: `${index * 40}ms` }}
                />

                <circle
                  cx={x}
                  cy={y}
                  r="18"
                  fill="#ffffff"
                  opacity="0"
                  pointerEvents="all"
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() =>
                    setHovered({
                      ...point,
                      svgX: x,
                      svgY: y,
                    })
                  }
                  onMouseMove={() =>
                    setHovered({
                      ...point,
                      svgX: x,
                      svgY: y,
                    })
                  }
                  onMouseLeave={() => setHovered(null)}
                />
              </g>
            );
          })
        )}

        {hovered &&
          (() => {
            const config = TYPE_CONFIG[hovered.type];
            const boxWidth = 150;
            const boxHeight = 74;

            const tooltipX =
              hovered.svgX + boxWidth + 12 > WIDTH
                ? hovered.svgX - boxWidth - 12
                : hovered.svgX + 12;

            const tooltipY =
              hovered.svgY - boxHeight - 12 < PAD_TOP
                ? hovered.svgY + 12
                : hovered.svgY - boxHeight - 12;

            return (
              <g pointerEvents="none">
                <rect
                  x={tooltipX}
                  y={tooltipY}
                  width={boxWidth}
                  height={boxHeight}
                  rx="10"
                  fill="#0f172a"
                  opacity="0.95"
                />

                <text
                  x={tooltipX + 10}
                  y={tooltipY + 18}
                  fontSize="11"
                  fontWeight="700"
                  fill={config.color}
                >
                  {config.label}
                </text>

                <text
                  x={tooltipX + 10}
                  y={tooltipY + 36}
                  fontSize="10"
                  fill="#cbd5e1"
                >
                  {hovered.region}
                </text>

                <text
                  x={tooltipX + 10}
                  y={tooltipY + 52}
                  fontSize="10"
                  fill="#94a3b8"
                >
                  Year: {hovered.year}
                </text>

                <text
                  x={tooltipX + 10}
                  y={tooltipY + 68}
                  fontSize="12"
                  fontWeight="700"
                  fill={config.color}
                >
                  {formatNumber(hovered.value)}%
                </text>
              </g>
            );
          })()}
      </svg>
    </div>
  );
}

export default function Forecasting() {
  const [actualData, setActualData] = useState([]);
  const [predictedData, setPredictedData] = useState([]);
  const [forecastedData, setForecastedData] = useState([]);

  const [loading, setLoading] = useState(true);
  const [regionFilter, setRegionFilter] = useState("all");
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [actualRes, predictedRes, forecastRes] = await Promise.allSettled([
        getRegionalData(),
        getPredictions(),
        getForecast(),
      ]);

      if (actualRes.status === "fulfilled") {
        setActualData(actualRes.value.data.regionalData || []);
      }

      if (predictedRes.status === "fulfilled") {
        setPredictedData(predictedRes.value.data.predictions || []);
      }

      if (forecastRes.status === "fulfilled") {
        setForecastedData(forecastRes.value.data.forecast || []);
      }
    } catch {
      setError("Failed to load forecasting data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const combinedData = useMemo(() => {
    const actual = actualData.map((row) => ({
      type: "actual",
      region: row.region,
      year: Number(row.year),
      value: getActualValue(row),
    }));

    const predicted = predictedData.map((row) => ({
      type: "predicted",
      region: row.region,
      year: Number(row.prediction_year || row.year),
      value: getPredictedValue(row),
    }));

    const forecasted = forecastedData.map((row) => ({
      type: "forecasted",
      region: row.region,
      year: Number(row.forecast_year),
      value: getForecastValue(row),
    }));

    return [...actual, ...predicted, ...forecasted]
      .filter(
        (row) =>
          row.region &&
          !Number.isNaN(row.year) &&
          !Number.isNaN(row.value)
      )
      .sort((a, b) => a.year - b.year || a.region.localeCompare(b.region));
  }, [actualData, predictedData, forecastedData]);

  const uniqueRegions = useMemo(() => {
    return [...new Set(combinedData.map((row) => row.region))].sort();
  }, [combinedData]);

  const selectedRegion =
    regionFilter === "all" ? uniqueRegions[0] || "" : regionFilter;

  const chartData = useMemo(() => {
    return combinedData.filter((row) => row.region === selectedRegion);
  }, [combinedData, selectedRegion]);

  const latestStats = useMemo(() => {
    const getLatest = (type) => {
      const values = chartData
        .filter((row) => row.type === type)
        .sort((a, b) => b.year - a.year);

      return values[0] || null;
    };

    return {
      actual: getLatest("actual"),
      predicted: getLatest("predicted"),
      forecasted: getLatest("forecasted"),
    };
  }, [chartData]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="h-4 w-4 text-[#002366]" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#002366]">
                Poverty Forecast
              </p>
            </div>

            <h1 className="text-xl font-bold text-slate-900">
              Forecasting
            </h1>

            <p className="text-xs text-slate-500">
              Animated line chart for actual, predicted, and forecasted poverty incidence.
            </p>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 shadow-sm flex items-center gap-1.5"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        {error && (
          <Alert type="error" message={error} onClose={() => setError("")} />
        )}

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 flex flex-col items-center gap-3 text-slate-400 shadow-sm">
            <Loader />
            <span className="text-xs">Loading forecasting data…</span>
          </div>
        ) : combinedData.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center shadow-sm">
            <AlertCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-800">No data yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Train the model first to generate results.
            </p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:border-[#002366] outline-none"
              >
                <option value="all">{uniqueRegions[0] || "Select Region"}</option>
                {uniqueRegions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>

              <div className="flex flex-wrap items-center gap-2">
                {Object.entries(TYPE_CONFIG).map(([type, config]) => (
                  <span
                    key={type}
                    className={`text-[10px] px-2 py-1 rounded-full border ${config.bg} ${config.text} ${config.border}`}
                  >
                    {config.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {selectedRegion}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Hover over each point to view region, year, and value.
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  {Object.entries(latestStats).map(([type, row]) => {
                    const config = TYPE_CONFIG[type];

                    return (
                      <div key={type} className="text-right">
                        <p className="text-[10px] text-slate-400">
                          Latest {config.label.replace(" Data", "").toLowerCase()}
                        </p>
                        <p
                          className="text-base font-extrabold"
                          style={{ color: config.color }}
                        >
                          {row ? `${formatNumber(row.value)}%` : "—"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="px-4 py-4">
                <AnimatedLineChart
                  data={chartData}
                  region={selectedRegion}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}