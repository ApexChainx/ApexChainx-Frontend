/** ApexChain Network Operations Intelligence Platform */
/**
 * MTTR utilities (Issue #915).
 *
 * Pure helpers for normalising, clamping and displaying mean-time-to-repair
 * values used by SLA operations views. Inputs may arrive from the API as
 * minutes (number or numeric string) or as a compact "1h 30m" string, so all
 * entry points funnel through `normalizeMttrMinutes`.
 */

const DEFAULT_EMPTY_LABEL = "\u2014";

/** Options controlling how an MTTR value is rendered. */
export interface MttrFormatOptions {
  /** Placeholder returned when the input cannot be resolved. */
  emptyLabel?: string | undefined;
  /** Render seconds in addition to hours and minutes. */
  includeSeconds?: boolean | undefined;
}

/** Decimal places used by `formatMttrHours`. */
export interface MttrHoursFormatOptions {
  emptyLabel?: string | undefined;
  decimals?: number | undefined;
}

/**
 * Resolve an MTTR input to a non-negative number of minutes.
 *
 * Accepts plain numbers, numeric strings and compound strings such as
 * `90`, `"90"`, `"1h 30m"` or `"1.5h"`. Invalid, negative and nullish values
 * resolve to `null` rather than throwing.
 */
export function normalizeMttrMinutes(
  input: number | string | null | undefined,
): number | null {
  if (input === null || input === undefined) {
    return null;
  }

  if (typeof input === "number") {
    return Number.isFinite(input) && input >= 0 ? input : null;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const compound = /^(?:(\d+(?:\.\d+)?)\s*h)?\s*(?:(\d+(?:\.\d+)?)\s*m)?$/i.exec(
    trimmed,
  );
  if (compound && (compound[1] !== undefined || compound[2] !== undefined)) {
    const hours = compound[1] === undefined ? 0 : Number.parseFloat(compound[1]);
    const minutes =
      compound[2] === undefined ? 0 : Number.parseFloat(compound[2]);
    const total = hours * 60 + minutes;
    return Number.isFinite(total) && total >= 0 ? total : null;
  }

  const numeric = Number(trimmed);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
}

/** Clamp an MTTR value into the inclusive range `[min, max]`. */
export function clampMttrMinutes(
  minutes: number | string | null | undefined,
  min: number,
  max: number,
): number | null {
  const value = normalizeMttrMinutes(minutes);
  if (value === null) {
    return null;
  }
  const lower = Math.min(min, max);
  const upper = Math.max(min, max);
  return Math.min(upper, Math.max(lower, value));
}

/** Format an MTTR value as a compact human-readable duration. */
export function formatMttr(
  minutes: number | string | null | undefined,
  options: MttrFormatOptions = {},
): string {
  const emptyLabel = options.emptyLabel ?? DEFAULT_EMPTY_LABEL;
  const value = normalizeMttrMinutes(minutes);
  if (value === null) {
    return emptyLabel;
  }

  if (options.includeSeconds ?? false) {
    const wholeSeconds = Math.round(value);
    const hours = Math.floor(wholeSeconds / 3600);
    const mins = Math.floor((wholeSeconds % 3600) / 60);
    const secs = wholeSeconds % 60;
    const parts: string[] = [];
    if (hours > 0) {
      parts.push(`${hours}h`);
    }
    if (mins > 0 || hours > 0) {
      parts.push(`${mins}m`);
    }
    parts.push(`${secs}s`);
    return parts.join(" ");
  }

  const rounded = Math.round(value);
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  if (hours === 0) {
    return `${mins}m`;
  }
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}

/** Format an MTTR value in hours, e.g. `1.5h`. */
export function formatMttrHours(
  minutes: number | string | null | undefined,
  options: MttrHoursFormatOptions = {},
): string {
  const value = normalizeMttrMinutes(minutes);
  if (value === null) {
    return options.emptyLabel ?? DEFAULT_EMPTY_LABEL;
  }
  const decimals = options.decimals ?? 1;
  return `${(value / 60).toFixed(decimals)}h`;
}

/** Whether an MTTR value is within (or equal to) a configured threshold. */
export function isWithinMttrThreshold(
  minutes: number | string | null | undefined,
  thresholdMinutes: number,
): boolean {
  const value = normalizeMttrMinutes(minutes);
  return value !== null && value <= thresholdMinutes;
}
