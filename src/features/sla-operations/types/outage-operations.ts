/** ApexChain Network Operations Intelligence Platform */
/**
 * Outage operations domain types (Issue #904).
 *
 * Local, UI-focused contracts for outage tables, detail panels and forms.
 * Severity/status unions are redeclared here on purpose: the workspace must
 * not import or mutate core application types, and these models may evolve
 * independently as the operations workspace grows.
 */

/** Severity values used by outage operations views. */
export type OutageSeverity = "low" | "medium" | "high" | "critical";

/** Lifecycle status of an outage as shown to operators. */
export type OutageStatus =
  | "open"
  | "investigating"
  | "mitigating"
  | "resolved";

/** One row in an outage operations table. */
export interface OutageRow {
  id: string;
  siteName: string;
  siteId: string;
  severity: OutageSeverity;
  status: OutageStatus;
  /** ISO-8601 timestamp the outage was detected. */
  detectedAt: string;
  /** ISO-8601 timestamp the outage was resolved, if applicable. */
  resolvedAt?: string | null;
  /** Mean time to repair in minutes, available once resolved. */
  mttrMinutes?: number | null;
  affectedSubscribers: number;
  affectedServices: string[];
  assignedTo?: string | null;
}

/** The kind of change recorded by an outage timeline entry. */
export type OutageTimelineEventKind =
  | "detected"
  | "acknowledged"
  | "status-change"
  | "annotation"
  | "resolved";

/** One entry in an outage's chronological event list. */
export interface OutageTimelineEntry {
  id: string;
  kind: OutageTimelineEventKind;
  /** ISO-8601 timestamp the event occurred. */
  timestamp: string;
  /** Operator or system that produced the event. */
  actor?: string | null;
  message: string;
  /** Present for `status-change` events. */
  previousStatus?: OutageStatus | undefined;
  /** Present for `status-change` events. */
  nextStatus?: OutageStatus | undefined;
}

/** Filter state for outage lists and panels. */
export interface OutageFilterState {
  search?: string | undefined;
  severities: OutageSeverity[];
  statuses: OutageStatus[];
  /** Inclusive lower bound as an ISO date string. */
  from?: string | undefined;
  /** Inclusive upper bound as an ISO date string. */
  to?: string | undefined;
  assignedTo?: string | undefined;
}

/** Payload produced by an "add annotation" form on an outage. */
export interface OutageAnnotationPayload {
  outageId: string;
  body: string;
  category?: "note" | "cause" | "resolution" | undefined;
  authorId?: string | undefined;
}
