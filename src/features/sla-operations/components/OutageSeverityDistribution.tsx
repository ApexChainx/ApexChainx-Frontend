/** ApexChain Network Operations Intelligence Platform */
import type { ReactElement } from "react";

export interface OutageSeverityCount {
  /** Severity label, e.g. "critical", "major", "minor". */
  severity: string;
  count: number;
}

export interface OutageSeverityDistributionProps {
  data: OutageSeverityCount[];
  isLoading?: boolean;
  error?: string | null;
}

/** Horizontal bar breakdown of outage counts by severity. */
export function OutageSeverityDistribution({
  data,
  isLoading = false,
  error = null,
}: OutageSeverityDistributionProps): ReactElement {
  const total = data.reduce((sum, d) => sum + Math.max(0, d.count), 0);

  return (
    <section
      aria-labelledby="outage-severity-heading"
      aria-busy={isLoading}
      className="rounded-lg border p-4"
    >
      <h2 id="outage-severity-heading" className="text-base font-semibold">
        Outages by severity
      </h2>
      {isLoading ? (
        <p role="status" className="mt-3 text-sm">Loading outage severity data...</p>
      ) : error ? (
        <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>
      ) : total === 0 ? (
        <p className="mt-3 text-sm">No outages recorded for this period.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {data.map((d) => {
            const pct = Math.round((Math.max(0, d.count) / total) * 100);
            return (
              <li key={d.severity}>
                <div className="flex justify-between text-sm">
                  <span className="capitalize">{d.severity}</span>
                  <span>{d.count} ({pct}%)</span>
                </div>
                <div
                  role="progressbar"
                  aria-label={`${d.severity} outages`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={pct}
                  className="h-2 w-full rounded bg-gray-200"
                >
                  <div className="h-2 rounded bg-blue-600" style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default OutageSeverityDistribution;
