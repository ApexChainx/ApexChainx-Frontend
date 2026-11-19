export interface SlaTrendPoint {
  /** Label for the period, e.g. "2026-01" or "Week 3". */
  period: string;
  /** SLA compliance percentage (0-100). */
  compliancePct: number;
}

export interface SlaTrendSummaryPanelProps {
  points: SlaTrendPoint[];
  isLoading?: boolean;
  error?: string | null;
  /** Absolute change (percentage points) between consecutive points to highlight. Default 5. */
  highlightThreshold?: number;
}

export function SlaTrendSummaryPanel({
  points,
  isLoading = false,
  error = null,
  highlightThreshold = 5,
}: SlaTrendSummaryPanelProps) {
  return (
    <section aria-labelledby="sla-trend-heading" className="rounded-lg border p-4">
      <h2 id="sla-trend-heading" className="text-base font-semibold">
        SLA Trend Summary
      </h2>
      {isLoading ? (
        <p role="status" aria-live="polite" className="mt-2 text-sm text-gray-500">
          Loading SLA trend...
        </p>
      ) : error ? (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      ) : points.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500">No SLA trend data available.</p>
      ) : (
        <Summary points={points} threshold={highlightThreshold} />
      )}
    </section>
  );
}

function Summary({ points, threshold }: { points: SlaTrendPoint[]; threshold: number }) {
  const latest = points[points.length - 1];
  const avg = points.reduce((sum, p) => sum + p.compliancePct, 0) / points.length;
  const changes = points
    .slice(1)
    .map((p, i) => ({ period: p.period, delta: p.compliancePct - points[i].compliancePct }))
    .filter((c) => Math.abs(c.delta) >= threshold);

  return (
    <div className="mt-2 space-y-3 text-sm">
      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <dt className="text-gray-500">Latest ({latest.period})</dt>
          <dd className="font-medium">{latest.compliancePct.toFixed(1)}%</dd>
        </div>
        <div>
          <dt className="text-gray-500">Average</dt>
          <dd className="font-medium">{avg.toFixed(1)}%</dd>
        </div>
      </dl>
      <div>
        <h3 className="font-medium">Key changes</h3>
        {changes.length === 0 ? (
          <p className="text-gray-500">No significant changes.</p>
        ) : (
          <ul className="list-disc pl-5">
            {changes.map((c) => (
              <li key={c.period}>
                {c.period}: {c.delta > 0 ? "+" : ""}
                {c.delta.toFixed(1)} pts
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default SlaTrendSummaryPanel;
