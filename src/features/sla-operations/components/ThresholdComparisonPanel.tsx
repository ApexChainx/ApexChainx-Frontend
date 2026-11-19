export interface ThresholdComparisonRow {
  metric: string;
  threshold: number;
  observed: number;
  unit?: string;
  /** When true, lower observed values are better (e.g. MTTR). Defaults to true. */
  lowerIsBetter?: boolean;
}

export interface ThresholdComparisonPanelProps {
  rows?: ThresholdComparisonRow[];
  isLoading?: boolean;
  error?: string | null;
}

export function ThresholdComparisonPanel({
  rows = [],
  isLoading = false,
  error = null,
}: ThresholdComparisonPanelProps) {
  let body;
  if (isLoading) {
    body = <p role="status">Loading threshold comparison...</p>;
  } else if (error) {
    body = <p role="alert">{error}</p>;
  } else if (rows.length === 0) {
    body = <p>No thresholds configured.</p>;
  } else {
    body = (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Configured thresholds versus observed metrics</caption>
          <thead>
            <tr>
              <th scope="col">Metric</th>
              <th scope="col">Threshold</th>
              <th scope="col">Observed</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const ok = (r.lowerIsBetter ?? true) ? r.observed <= r.threshold : r.observed >= r.threshold;
              const unit = r.unit ? " " + r.unit : "";
              return (
                <tr key={r.metric}>
                  <th scope="row">{r.metric}</th>
                  <td>{r.threshold}{unit}</td>
                  <td>{r.observed}{unit}</td>
                  <td className={ok ? "text-green-700" : "text-red-600"}>{ok ? "Within threshold" : "Breached"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
  return (
    <section aria-label="Threshold comparison" className="rounded-lg border p-4">
      {body}
    </section>
  );
}
