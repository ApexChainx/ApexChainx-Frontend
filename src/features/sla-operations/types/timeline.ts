/** ApexChain Network Operations Intelligence Platform */
/**
 * Incident timeline types (Issue #909).
 *
 * Models timeline events, their actors/sources and grouping metadata for
 * chronological rendering of outage and SLA incident visualisations.
 */

/** Domain category of a timeline event, used for icons and colour tokens. */
export type TimelineCategory =
  | "outage"
  | "sla"
  | "payment"
  | "webhook"
  | "annotation"
  | "system";

/** Origin of a timeline event. */
export type TimelineActorKind = "operator" | "system" | "webhook" | "automation";

/** Actor or source responsible for a timeline event. */
export interface TimelineActor {
  kind: TimelineActorKind;
  id: string;
  /** Human-readable name shown in the UI. */
  label: string;
}

/** A single incident timeline event. */
export interface TimelineEvent {
  id: string;
  category: TimelineCategory;
  title: string;
  description?: string | undefined;
  /** ISO-8601 timestamp used for chronological ordering. */
  timestamp: string;
  actor?: TimelineActor | undefined;
  /** Identifier of the related outage, settlement or endpoint, if any. */
  referenceId?: string | undefined;
  /** Short badge/chip label. */
  label?: string | undefined;
}

/** A chronological bucket (e.g. one day) of timeline events. */
export interface TimelineGroup {
  id: string;
  label: string;
  /** Bucket key used for grouping, typically an ISO date. */
  bucket: string;
  events: TimelineEvent[];
}
