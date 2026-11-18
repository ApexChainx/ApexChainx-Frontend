/** ApexChain Network Operations Intelligence Platform */
/**
 * Percentage and ratio utilities (Issue #920).
 *
 * Safe arithmetic and formatting for KPI/compliance metrics. Division by a
 * non-positive or non-finite denominator yields `null` instead of
 * `Infinity`/`NaN`, so callers can render an explicit placeholder.
 */

/** Options controlling percentage rendering. */
export interface PercentageFormatOptions {
  /** Number of fractional digits. Defaults to 1. */
  decimals?: number | undefined;
  /** Placeholder for invalid input. */
  emptyLabel?: string | undefined;
  /** Suffix appended to the value. Defaults to "%". */
  suffix?: string | undefined;
}

const DEFAULT_EMPTY_LABEL = "\u2014";

/** Divide two values into a ratio, or `null` when the division is unsafe. */
export function calculateRatio(
  numerator: number | null | undefined,
  denominator: number | null | undefined,
): number | null {
  if (typeof numerator !== "number" || typeof denominator !== "number") {
    return null;
  }
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) {
    return null;
  }
  if (denominator <= 0) {
    return null;
  }
  const ratio = numerator / denominator;
  return Number.isFinite(ratio) ? ratio : null;
}

/** Express a ratio as a percentage in the range 0..100 when computable. */
export function calculatePercentage(
  numerator: number | null | undefined,
  denominator: number | null | undefined,
): number | null {
  const ratio = calculateRatio(numerator, denominator);
  return ratio === null ? null : ratio * 100;
}

/** Clamp a percentage into an inclusive range; invalid input yields `null`. */
export function clampPercentage(
  value: number | null | undefined,
  min = 0,
  max = 100,
): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return Math.min(max, Math.max(min, value));
}

/** Format a percentage value for display. */
export function formatPercentage(
  value: number | null | undefined,
  options: PercentageFormatOptions = {},
): string {
  const emptyLabel = options.emptyLabel ?? DEFAULT_EMPTY_LABEL;
  const clamped = clampPercentage(value);
  if (clamped === null) {
    return emptyLabel;
  }
  const decimals = options.decimals ?? 1;
  return `${clamped.toFixed(decimals)}${options.suffix ?? "%"}`;
}

/** Relative change from `previous` to `current`, expressed as a percentage. */
export function calculateDeltaPercentage(
  current: number | null | undefined,
  previous: number | null | undefined,
): number | null {
  if (typeof current !== "number" || typeof previous !== "number") {
    return null;
  }
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) {
    return null;
  }
  return ((current - previous) / Math.abs(previous)) * 100;
}
