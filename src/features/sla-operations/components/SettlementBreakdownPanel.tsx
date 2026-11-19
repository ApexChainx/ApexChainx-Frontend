export interface SettlementBreakdown {
  /** Total reward amount (non-negative). */
  reward: number;
  /** Total penalty amount (non-negative). */
  penalty: number;
}

export interface SettlementBreakdownPanelProps {
  breakdown: SettlementBreakdown | null;
  /** Currency/asset code used for display, e.g. "USDC". */
  currency?: string;
  isLoading?: boolean;
  error?: string | null;
}

export function SettlementBreakdownPanel({
  breakdown,
  currency = "USDC",
  isLoading = false,
  error = null,
}: SettlementBreakdownPanelProps) {
  const fmt = (n: number) =>
    `${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;

  return (
    <section aria-labelledby="settlement-breakdown-heading" className="rounded-lg border p-4">
      <h2 id="settlement-breakdown-heading" className="text-base font-semibold">
        Settlement Breakdown
      </h2>
      {isLoading ? (
        <p role="status" aria-live="polite" className="mt-2 text-sm text-gray-500">
          Loading settlement...
        </p>
      ) : error ? (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      ) : !breakdown ? (
        <p className="mt-2 text-sm text-gray-500">No settlement data available.</p>
      ) : (
        <dl className="mt-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-gray-500">Reward</dt>
            <dd className="font-medium text-green-600">+{fmt(breakdown.reward)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Penalty</dt>
            <dd className="font-medium text-red-600">-{fmt(breakdown.penalty)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Net</dt>
            <dd className="font-semibold">{fmt(breakdown.reward - breakdown.penalty)}</dd>
          </div>
        </dl>
      )}
    </section>
  );
}

export default SettlementBreakdownPanel;
