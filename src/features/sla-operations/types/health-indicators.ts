/** ApexChain Network Operations Intelligence Platform */
/**
 * Operations health indicator types (Issue #914).
 *
 * Contracts for health/status indicators across outages, webhooks and
 * settlement pipelines. Strong discriminants make badge and panel rendering
 * exhaustive, and freshness metadata lets the UI degrade stale signals.
 */

/** Health level of a monitored signal. */
export type HealthLevel = "healthy" | "degraded" | "critical" | "unknown";

/** Source domain a health indicator belongs to. */
export type HealthSourceDomain =
  | "outages"
  | "webhooks"
  | "settlements"
  | "sla"
  | "payments";

/** A single health/status indicator. */
export interface HealthIndicator {
  id: string;
  label: string;
  level: HealthLevel;
  source: HealthSourceDomain;
  /** Human-readable message explaining the current level. */
  message: string;
  /** ISO-8601 timestamp the underlying signal was observed. */
  observedAt: string;
  /** Age of the signal in seconds at render time, when computed. */
  ageSeconds?: number | undefined;
  /** True when the signal is too old to be trusted. */
  stale: boolean;
}

/** Aggregated health across a set of indicators. */
export interface HealthAggregate {
  /** Worst level among the indicators, or "unknown" when none exist. */
  overall: HealthLevel;
  indicators: HealthIndicator[];
  /** Count of indicators at each level. */
  counts: Record<HealthLevel, number>;
  /** ISO-8601 timestamp the aggregate was computed. */
  updatedAt: string;
}

/** Presentation model for a health badge. */
export interface HealthBadgeModel {
  level: HealthLevel;
  label: string;
  /** Semantic colour token name, resolved by the UI layer. */
  tone: "success" | "warning" | "danger" | "neutral";
}
