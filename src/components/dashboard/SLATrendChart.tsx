import { TrendPoint } from "../../types/dashboard";

interface SLATrendChartProps {
  data: TrendPoint[];
  onPointClick?: (point: TrendPoint) => void;
}

const clampPercentage = (value: number) => Math.max(0, Math.min(100, value));

const SLATrendChart: React.FC<SLATrendChartProps> = ({ data, onPointClick }) => {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-gray-600 uppercase tracking-wide">
        SLA Compliance Trend
      </h3>
      <div className="space-y-3">
        {data.length === 0 ? (
          <p className="text-sm text-gray-500">No trend data available.</p>
        ) : (
          data.map((point) => (
            <div
              key={point.period}
              className={`space-y-1 ${onPointClick ? "cursor-pointer rounded-lg p-1 hover:bg-gray-50 transition-colors" : ""}`}
              onClick={() => onPointClick?.(point)}
              role={onPointClick ? "button" : undefined}
              tabIndex={onPointClick ? 0 : undefined}
              onKeyDown={(e) => e.key === "Enter" && onPointClick?.(point)}
            >
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>{point.period}</span>
                <span>{clampPercentage(point.compliance_percentage).toFixed(1)}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{ width: `${clampPercentage(point.compliance_percentage)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SLATrendChart;
