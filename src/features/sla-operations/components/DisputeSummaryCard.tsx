/** ApexChain Network Operations Intelligence Platform */

export type DisputeStatus = "open" | "under_review" | "resolved" | "rejected";

/** Local minimal dispute shape (no shared dispute type exists yet). */
export interface DisputeSummary {
  id: string;
  status: DisputeStatus;
  outageId?: string;
  reason: string;
  /** ISO-8601 timestamp. */
  openedAt: string;
  /** Disputed amount, already formatted for display. */
  amountLabel?: string;
}

export interface DisputeSummaryCardProps {
  dispute: DisputeSummary | null;
  isLoading?: boolean;
  error?: string | null;
}

const STATUS_LABELS: Record<DisputeStatus, string> = {
  open: "Open",
  under_review: "Under review",
  resolved: "Resolved",
  rejected: "Rejected",
};

/** Summary card for a single SLA dispute. */
export function DisputeSummaryCard({
  dispute,
  isLoading = false,
  error = null,
}: DisputeSummaryCardProps) {
  return (
    <section aria-labelledby="dispute-summary-heading" className="rounded-lg border p-4">
      <h2 id="dispute-summary-heading" className="mb-3 text-lg font-semibold">
        Dispute summary
      </h2>
      {isLoading ? (
        <p role="status">Loading dispute...</p>
      ) : error ? (
        <p role="alert">{error}</p>
      ) : !dispute ? (
        <p>No dispute for this outage.</p>
      ) : (
        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <dt className="text-xs opacity-70">Status</dt>
          <dd>{STATUS_LABELS[dispute.status]}</dd>
          <dt className="text-xs opacity-70">Reason</dt>
          <dd>{dispute.reason}</dd>
          <dt className="text-xs opacity-70">Opened</dt>
          <dd>
            <time dateTime={dispute.openedAt}>
              {Number.isNaN(Date.parse(dispute.openedAt))
                ? dispute.openedAt
                : new Date(dispute.openedAt).toLocaleString()}
            </time>
          </dd>
          {dispute.outageId ? (
            <>
              <dt className="text-xs opacity-70">Outage</dt>
              <dd>{dispute.outageId}</dd>
            </>
          ) : null}
          {dispute.amountLabel ? (
            <>
              <dt className="text-xs opacity-70">Amount</dt>
              <dd>{dispute.amountLabel}</dd>
            </>
          ) : null}
        </dl>
      )}
    </section>
  );
}

export default DisputeSummaryCard;
