/** ApexChain Network Operations Intelligence Platform */
import { useMemo } from "react";
import { TrendPoint } from "@/types/dashboard";

interface SLATrendChartProps {
  data: TrendPoint[];
  onPointClick?: (point: TrendPoint) => void;
}

const CHART_HEIGHT = 200;
const CHART_PADDING = { top: 20, right: 20, bottom: 40, left: 50 };

function clampPercentage(value: number): number {
  return Math.max(0, Math.min(100, value));
}

const SLATrendChart: React.FC<SLATrendChartProps> = ({ data, onPointClick }) => {
  const chartData = useMemo(() => {
    if (data.length === 0) return { points: [], pathD: "" };

    const width = 400;
    const innerWidth = width - CHART_PADDING.left - CHART_PADDING.right;
    const innerHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

    const points = data.map((point, index) => ({
      x: CHART_PADDING.left + (index / Math.max(1, data.length - 1)) * innerWidth,
      y: CHART_PADDING.top + (1 - clampPercentage(point.compliance_percentage) / 100) * innerHeight,
      data: point,
    }));

    const pathD = points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
      .join(" ");

    return { points, pathD };
  }, [data]);

  if (data.length === 0) {
    return (
    <div className="rounded-xl bg-white dark:bg-slate-900 p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
        SLA Compliance Trend
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">No trend data available.</p>
    </div>
  );
  }

  return (
    <div className="rounded-xl bg-white dark:bg-slate-900 p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
        SLA Compliance Trend
      </h3>
      <svg viewBox={`0 0 400 ${CHART_HEIGHT}`} className="w-full">
        <path
          d={chartData.pathD}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {chartData.points.map((point, index) => (
          <g key={point.data.period}>
            <circle
              cx={point.x}
              cy={point.y}
              r="4"
              fill="#3b82f6"
              className={onPointClick ? "cursor-pointer hover:fill-blue-700 dark:hover:fill-blue-400" : ""}
              onClick={() => onPointClick?.(point.data)}
            />
            <text
              x={point.x}
              y={CHART_HEIGHT - 5}
              textAnchor="middle"
              className="text-[8px] fill-gray-500 dark:fill-gray-400"
            >
              {point.data.period}
            </text>
            <text
              x={point.x}
              y={point.y - 8}
              textAnchor="middle"
              className="text-[8px] fill-gray-600 dark:fill-gray-300"
            >
              {clampPercentage(point.data.compliance_percentage).toFixed(0)}%
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

export default SLATrendChart;