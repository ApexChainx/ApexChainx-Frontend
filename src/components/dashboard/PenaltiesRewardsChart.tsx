import { TrendPoint } from "../../types/dashboard";
/** ApexChain Network Operations Intelligence Platform */

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
    <div className="rounded-xl bg-white dark:bg-slate-900 p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
        Penalties vs Rewards Over Time
      </h3>
      <div className="space-y-3">
        {data.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No payment trend data available.</p>
        ) : (
          data.map((point) => (
            <div
              key={point.period}
              className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-lg border border-gray-100 dark:border-slate-700 p-3"
            >
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{point.period}</span>
              <button
                onClick={() => onPenaltyClick?.(point)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${onPenaltyClick ? "cursor-pointer" : "cursor-default"} bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50`}
              >
                Penalties: {formatCurrency(point.penalties)}
              </button>
              <button
                onClick={() => onRewardClick?.(point)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${onRewardClick ? "cursor-pointer" : "cursor-default"} bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50`}
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