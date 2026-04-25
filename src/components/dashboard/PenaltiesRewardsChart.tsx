import { TrendPoint } from "../../types/dashboard";

interface PenaltiesRewardsChartProps {
  data: TrendPoint[];
  onPenaltyClick?: (point: TrendPoint) => void;
  onRewardClick?: (point: TrendPoint) => void;
}

const formatCurrency = (value: number) => `$${value.toLocaleString()}`;

const PenaltiesRewardsChart: React.FC<PenaltiesRewardsChartProps> = ({
  data,
  onPenaltyClick,
  onRewardClick,
}) => {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-gray-600 uppercase tracking-wide">
        Penalties vs Rewards Over Time
      </h3>
      <div className="space-y-3">
        {data.length === 0 ? (
          <p className="text-sm text-gray-500">No payment trend data available.</p>
        ) : (
          data.map((point) => (
            <div
              key={point.period}
              className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-lg border border-gray-100 p-3"
            >
              <span className="text-sm font-medium text-gray-700">{point.period}</span>
              <button
                onClick={() => onPenaltyClick?.(point)}
                className={`rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 ${onPenaltyClick ? "hover:bg-red-100 transition-colors cursor-pointer" : "cursor-default"}`}
              >
                Penalties: {formatCurrency(point.penalties)}
              </button>
              <button
                onClick={() => onRewardClick?.(point)}
                className={`rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-600 ${onRewardClick ? "hover:bg-green-100 transition-colors cursor-pointer" : "cursor-default"}`}
              >
                Rewards: {formatCurrency(point.rewards)}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PenaltiesRewardsChart;
