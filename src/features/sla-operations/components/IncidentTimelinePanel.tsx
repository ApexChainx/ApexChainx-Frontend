/** ApexChain Network Operations Intelligence Platform */
import type { TimelineEvent } from "../types/timeline";

export interface IncidentTimelinePanelProps {
  events: TimelineEvent[];
  isLoading?: boolean;
  error?: string | null;
}

/** Chronological (oldest first) panel of outage/SLA incident events. */
export function IncidentTimelinePanel({
  events,
  isLoading = false,
  error = null,
}: IncidentTimelinePanelProps) {
  const sorted = [...events].sort(
    (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp),
  );

  return (
    <section aria-labelledby="incident-timeline-heading" className="rounded-lg border p-4">
      <h2 id="incident-timeline-heading" className="mb-3 text-lg font-semibold">
        Incident timeline
      </h2>
      {isLoading ? (
        <p role="status">Loading timeline...</p>
      ) : error ? (
        <p role="alert">{error}</p>
      ) : sorted.length === 0 ? (
        <p>No incident events recorded.</p>
      ) : (
        <ol className="space-y-3">
          {sorted.map((event) => (
            <li key={event.id} className="border-l-2 pl-3">
              <time dateTime={event.timestamp} className="text-xs opacity-70">
                {Number.isNaN(Date.parse(event.timestamp))
                  ? event.timestamp
                  : new Date(event.timestamp).toLocaleString()}
              </time>
              <p className="font-medium">
                {event.title}
                {event.label ? (
                  <span className="ml-2 rounded border px-1 text-xs">{event.label}</span>
                ) : null}
              </p>
              {event.description ? <p className="text-sm">{event.description}</p> : null}
              {event.actor ? (
                <p className="text-xs opacity-70">By {event.actor.label}</p>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default IncidentTimelinePanel;
