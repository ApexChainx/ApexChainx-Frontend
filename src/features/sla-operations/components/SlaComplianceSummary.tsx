export interface SlaComplianceSummaryProps {
  /** Compliance percentage (0-100). */
  compliancePct?: number;
  violations?: number;
  /** Configured compliance threshold percentage. */
  thresholdPct?: number;
  isLoading?: boolean;
  error?: string | null;
}

export function SlaComplianceSummary({
  compliancePct,
  violations,
  thresholdPct,
  isLoading = false,
  error = null,
}: SlaComplianceSummaryProps) {
  let body;
  if (isLoading) {
    body = <p role="status">Loading SLA compliance...</p>;
  } else if (error) {
    body = <p role="alert">{error}</p>;
  } else if (compliancePct === undefined) {
    body = <p>No SLA compliance data available.</p>;
  } else {
    const meets = thresholdPct === undefined || compliancePct >= thresholdPct;
    body = (
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-sm text-gray-500">Compliance</dt>
          <dd className={meets ? "text-2xl font-semibold" : "text-2xl font-semibold text-red-600"}>
            {compliancePct.toFixed(1)}%
          </dd>
        </div>
        <div>
          <dt className="text-sm text-gray-500">Violations</dt>
          <dd className="text-2xl font-semibold">{violations ?? 0}</dd>
        </div>
        <div>
          <dt className="text-sm text-gray-500">Threshold</dt>
          <dd className="text-2xl font-semibold">
            {thresholdPct === undefined ? "N/A" : thresholdPct.toFixed(1) + "%"}
          </dd>
        </div>
      </dl>
    );
  }
  return (
    <section aria-label="SLA compliance summary" className="rounded-lg border p-4">
      {body}
    </section>
  );
}
