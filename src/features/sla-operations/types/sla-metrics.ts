/** ApexChain Network Operations Intelligence Platform */
/**
 * SLA metrics view-model types (Issue #903).
 *
 * UI-facing shapes for KPI summaries, trend points, compliance snapshots and
 * threshold deltas. These are deliberately decoupled from the API response
 * types so dashboard widgets can compose and memoise them without depending
 * on the wire format.
 */

/** A monetary amount paired with the currency it is denominated in. */
export interface MoneyAmount {
  /** Numeric amount; negative values represent penalties. */
  amount: number;
  /** ISO 4217 currency code, e.g. "USD". */
  currency: string;
}

/** A single point on an SLA compliance/KPI trend line. */
export interface SlaTrendPoint {
  /** ISO-8601 timestamp of the sample. */
  timestamp: string;
  /** Observed value (e.g. compliance percentage or MTTR minutes). */
  value: number;
  /** Optional label used for axis/tooltip rendering. */
  label?: string | undefined;
}

/** Snapshot of SLA compliance at a point in time. */
export interface ComplianceSnapshot {
  /** ISO-8601 timestamp the snapshot was taken. */
  timestamp: string;
  /** Compliance rate in the inclusive range 0..100. */
  complianceRate: number;
  /** Number of evaluated SLA results contributing to the rate. */
  evaluatedCount: number;
  /** Number of results that violated their SLA. */
  violatedCount: number;
}

/** Difference between an observed metric and its configured threshold. */
export interface ThresholdDelta {
  /** Metric identifier, e.g. "mttr_minutes" or "compliance_rate". */
  metric: string;
  /** Configured threshold value. */
  threshold: number;
  /** Observed value. */
  observed: number;
  /** `observed - threshold`; negative means within (or better than) the threshold. */
  delta: number;
  /** Whether the observed value satisfies the threshold. */
  withinThreshold: boolean;
}

/** Aggregated SLA KPI summary shown on operations dashboards. */
export interface SlaKpiSummary {
  /** Number of SLAs evaluated in the period. */
  totalEvaluated: number;
  /** Number of SLAs met in the period. */
  totalMet: number;
  /** Number of SLA violations in the period. */
  violationCount: number;
  /** Mean time to repair, in minutes. */
  mttrMinutes: number;
  /** Configured MTTR threshold, in minutes. */
  mttrThresholdMinutes: number;
  /** Current compliance rate (0..100). */
  complianceRate: number;
  /** Net settlement amount (rewards minus penalties). */
  netSettlement: MoneyAmount;
  /** Total rewards accrued in the period. */
  totalRewards: MoneyAmount;
  /** Total penalties accrued in the period. */
  totalPenalties: MoneyAmount;
  /** Trend series for compliance over the period. */
  complianceTrend: SlaTrendPoint[];
  /** Latest compliance snapshot, when one has been recorded. */
  latestSnapshot?: ComplianceSnapshot | undefined;
  /** Threshold comparisons for the headline metrics. */
  thresholdDeltas: ThresholdDelta[];
}
