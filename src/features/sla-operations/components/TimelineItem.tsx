/** ApexChain Network Operations Intelligence Platform */
/**
 * Timeline item row (Issue #986).
 *
 * Renders a single incident/event timeline entry. Designed as the list item
 * used by timeline panels (e.g. `IncidentTimelinePanel`), but usable on its
 * own wherever a single chronological event needs to be shown.
 */
import type { TimelineCategory, TimelineEvent } from "../types/timeline";

export interface TimelineItemProps {
  event: TimelineEvent;
  /** Render as an `<li>` (default) for use inside an `<ol>`/`<ul>`, or a plain `<div>`. */
  as?: "li" | "div" | undefined;
  className?: string | undefined;
}

/** Shape glyphs so the category is not signalled by colour alone. */
const CATEGORY_GLYPH: Record<TimelineCategory, string> = {
  outage: "▲",
  sla: "◆",
  payment: "●",
  webhook: "◼",
  annotation: "✎",
  system: "⚙",
};

const CATEGORY_STYLES: Record<TimelineCategory, string> = {
  outage: "border-red-300 text-red-800 dark:border-red-800 dark:text-red-200",
  sla: "border-amber-300 text-amber-800 dark:border-amber-800 dark:text-amber-200",
  payment: "border-green-300 text-green-800 dark:border-green-800 dark:text-green-200",
  webhook: "border-blue-300 text-blue-800 dark:border-blue-800 dark:text-blue-200",
  annotation: "border-purple-300 text-purple-800 dark:border-purple-800 dark:text-purple-200",
  system: "border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-300",
};

const CATEGORY_LABEL: Record<TimelineCategory, string> = {
  outage: "Outage",
  sla: "SLA",
  payment: "Payment",
  webhook: "Webhook",
  annotation: "Annotation",
  system: "System",
};

function formatTimestamp(timestamp: string): string {
  const parsed = Date.parse(timestamp);
  return Number.isNaN(parsed) ? timestamp : new Date(parsed).toLocaleString();
}

export function TimelineItem({ event, as = "li", className = "" }: TimelineItemProps) {
  const Tag = as;
  const toneClass = CATEGORY_STYLES[event.category] ?? CATEGORY_STYLES.system;
  const glyph = CATEGORY_GLYPH[event.category] ?? CATEGORY_GLYPH.system;

  return (
    <Tag
      data-category={event.category}
      className={`flex gap-2 border-l-2 py-1 pl-3 ${toneClass} ${className}`.trim()}
    >
      <span aria-hidden="true" className="mt-0.5 shrink-0">
        {glyph}
      </span>
      <div className="min-w-0">
        <p className="text-xs opacity-70">
          <span className="sr-only">{CATEGORY_LABEL[event.category] ?? "Event"}: </span>
          <time dateTime={event.timestamp}>{formatTimestamp(event.timestamp)}</time>
        </p>
        <p className="font-medium text-gray-900 dark:text-gray-100">
          {event.title}
          {event.label ? (
            <span className="ml-2 rounded border px-1 text-xs font-normal">{event.label}</span>
          ) : null}
        </p>
        {event.description ? (
          <p className="text-sm text-gray-700 dark:text-gray-300">{event.description}</p>
        ) : null}
        {event.actor ? (
          <p className="text-xs opacity-70">By {event.actor.label}</p>
        ) : null}
      </div>
    </Tag>
  );
}

export default TimelineItem;
