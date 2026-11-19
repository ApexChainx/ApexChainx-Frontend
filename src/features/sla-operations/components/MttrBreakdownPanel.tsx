export interface MttrBucket {
  label: string;
  /** Number of incidents in this bucket. */
  count: number;
}

export interface MttrBreakdownPanelProps {
  /** Mean time to resolve, in minutes. */
  meanMinutes?: number;
  medianMinutes?: number;
  buckets?: MttrBucket[];
  isLoading?: boolean;
  error?: string | null;
}

function formatMinutes(m: number): string {
  if (m < 60) return Math.round(m) + " min";
  return (m / 60).toFixed(1) + " h";
}

export function MttrBreakdownPanel({
  meanMinutes,
  medianMinutes,
  buckets = [],
  isLoading = false,
  error = null,
}: MttrBreakdownPanelProps) {
  let body;
  if (isLoading) {
    body = <p role="status">Loading MTTR breakdown...</p>;
  } else if (error) {
    body = <p role="alert">{error}</p>;
  } else if (meanMinutes === undefined && buckets.length === 0) {
    body = <p>No MTTR data available.</p>;
  } else {
    const max = Math.max(1, ...buckets.map((b) => b.count));
    body = (
      <div className="space-y-4">
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm text-gray-500">Mean</dt>
            <dd className="text-2xl font-semibold">{meanMinutes === undefined ? "N/A" : formatMinutes(meanMinutes)}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Median</dt>
            <dd className="text-2xl font-semibold">{medianMinutes === undefined ? "N/A" : formatMinutes(medianMinutes)}</dd>
          </div>
        </dl>
        <ul className="space-y-2">
          {buckets.map((b) => (
            <li key={b.label}>
              <div className="flex justify-between text-sm">
                <span>{b.label}</span>
                <span>{b.count}</span>
              </div>
              <progress className="w-full" max={max} value={b.count} aria-label={b.label + " incidents"} />
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <section aria-label="MTTR breakdown" className="rounded-lg border p-4">
      {body}
    </section>
  );
}
