/** ApexChain Network Operations Intelligence Platform */
/**
 * Threshold comparison helpers (Issue #929).
 *
 * Compare an observed metric with an SLA threshold and derive a delta
 * indicator. Invalid (nullish / non-finite) input yields an `unknown` result
 * instead of throwing.
 */

/** Whether a higher or lower observed value is better (e.g. uptime vs. latency). */
export type ThresholdDirection = "higher-is-better" | "lower-is-better";

/** Outcome of comparing an observed value to a threshold. */
export type ThresholdStatus = "meeting" | "breaching" | "unknown";

/** Result of a threshold comparison. */
export interface ThresholdComparison {
  status: ThresholdStatus;
  /** observed - threshold, or null when it cannot be computed. */
  delta: number | null;
  /** Delta as a percentage of the threshold, or null when threshold is 0 or invalid. */
  deltaPercent: number | null;
  /** Arrow for UI display: above, below or equal to threshold. */
  trend: "up" | "down" | "flat" | "none";
}

function isValid(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** Compare an observed value against a threshold. Equal values meet the threshold. */
export function compareToThreshold(
  observed: number | null | undefined,
  threshold: number | null | undefined,
  direction: ThresholdDirection = "higher-is-better",
): ThresholdComparison {
  if (!isValid(observed) || !isValid(threshold)) {
    return { status: "unknown", delta: null, deltaPercent: null, trend: "none" };
  }
  const delta = observed - threshold;
  const meeting = direction === "higher-is-better" ? delta >= 0 : delta <= 0;
  return {
    status: meeting ? "meeting" : "breaching",
    delta,
    deltaPercent: threshold === 0 ? null : (delta / Math.abs(threshold)) * 100,
    trend: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
  };
}

/** Whether the observed value breaches the threshold. */
export function isBreaching(
  observed: number | null | undefined,
  threshold: number | null | undefined,
  direction: ThresholdDirection = "higher-is-better",
): boolean {
  return compareToThreshold(observed, threshold, direction).status === "breaching";
}
