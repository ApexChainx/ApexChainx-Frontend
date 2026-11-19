/** ApexChain Network Operations Intelligence Platform */
import type { ReactElement } from "react";

export interface PaymentReconciliationTotals {
  /** Counts of payments in each reconciliation state. */
  matched: number;
  unmatched: number;
  pending: number;
  /** Total settled amount in the given currency. */
  totalAmount: number;
  currency: string;
}

export interface PaymentReconciliationSummaryProps {
  totals: PaymentReconciliationTotals | null;
  isLoading?: boolean;
  error?: string | null;
}

/** Summary of payment reconciliation counts and total amount. */
export function PaymentReconciliationSummary({
  totals,
  isLoading = false,
  error = null,
}: PaymentReconciliationSummaryProps): ReactElement {
  const count = totals ? totals.matched + totals.unmatched + totals.pending : 0;

  return (
    <section
      aria-labelledby="payment-recon-heading"
      aria-busy={isLoading}
      className="rounded-lg border p-4"
    >
      <h2 id="payment-recon-heading" className="text-base font-semibold">
        Payment reconciliation
      </h2>
      {isLoading ? (
        <p role="status" className="mt-3 text-sm">Loading reconciliation summary...</p>
      ) : error ? (
        <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>
      ) : !totals || count === 0 ? (
        <p className="mt-3 text-sm">No payments to reconcile.</p>
      ) : (
        <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div><dt className="text-xs">Matched</dt><dd className="text-lg font-semibold">{totals.matched}</dd></div>
          <div><dt className="text-xs">Unmatched</dt><dd className="text-lg font-semibold">{totals.unmatched}</dd></div>
          <div><dt className="text-xs">Pending</dt><dd className="text-lg font-semibold">{totals.pending}</dd></div>
          <div>
            <dt className="text-xs">Total amount</dt>
            <dd className="text-lg font-semibold">
              {new Intl.NumberFormat(undefined, { style: "currency", currency: totals.currency }).format(totals.totalAmount)}
            </dd>
          </div>
        </dl>
      )}
    </section>
  );
}

export default PaymentReconciliationSummary;
