/** ApexChain Network Operations Intelligence Platform */
/**
 * KPI card types (Issue #911).
 *
 * Typed models for KPI cards, deltas and status indicators on SLA operations
 * dashboards. Each card carries both a preformatted display value and a raw
 * numeric value so it can be rendered and sorted without reformatting.
 */

/** Direction of change for a KPI delta. */
export type KpiTrendDirection = "up" | "down" | "flat";

/** Semantic state used to pick a colour token for a KPI card. */
export type KpiSemanticState = "positive" | "neutral" | "warning" | "negative";

/** How the KPI value should be interpreted and rendered. */
export type KpiVariant = "percentage" | "absolute" | "duration";

/** Change of a KPI relative to a comparison period. */
export interface KpiDelta {
  /** Signed magnitude of the change. */
  value: number;
  direction: KpiTrendDirection;
  /** Human-readable comparison, e.g. "vs previous period". */
  comparisonLabel?: string | undefined;
}

/** View model for a single KPI card. */
export interface KpiCardModel {
  id: string;
  label: string;
  variant: KpiVariant;
  /** Preformatted value ready for display, e.g. "99.5%" or "1h 24m". */
  displayValue: string;
  /** Raw numeric value used for sorting and comparison. */
  rawValue: number;
  /** Unit suffix when the display value does not already include one. */
  unit?: string | undefined;
  delta?: KpiDelta | undefined;
  state: KpiSemanticState;
  helperText?: string | undefined;
}
