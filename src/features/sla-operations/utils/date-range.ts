/** ApexChain Network Operations Intelligence Platform */
/**
 * Date range utilities (Issue #918).
 *
 * Pure helpers for parsing, clamping, validating and labelling date ranges
 * used by operations filters and reports. Dates are normalised to `YYYY-MM-DD`
 * strings so they are stable across time zones and safe to place in query
 * parameters.
 */

/** A date range bounded by inclusive ISO date strings. */
export interface DateRange {
  from: string | null;
  to: string | null;
}

/** Recognised range presets. `custom` and `invalid` are non-generatable. */
export type DateRangePreset =
  | "today"
  | "last-7-days"
  | "last-30-days"
  | "this-month"
  | "custom"
  | "all"
  | "invalid";

/** Presets that can be turned into a concrete range. */
export type GeneratableDateRangePreset = Exclude<
  DateRangePreset,
  "custom" | "invalid"
>;

/** Options controlling range labels. */
export interface DateRangeLabelOptions {
  /** Label used when the range has no bounds. */
  emptyLabel?: string | undefined;
}

const MILLISECONDS_PER_DAY = 86_400_000;
const DEFAULT_EMPTY_LABEL = "All time";

/** Normalise an arbitrary value to an ISO `YYYY-MM-DD` date string. */
function toIsoDate(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString().slice(0, 10);
}

/** Parse a raw query/filter value into a `DateRange`. */
export function parseDateRange(
  input: { from?: unknown; to?: unknown } | string | null | undefined,
): DateRange {
  if (typeof input === "string") {
    const iso = toIsoDate(input);
    return { from: iso, to: iso };
  }
  if (input === null || typeof input !== "object") {
    return { from: null, to: null };
  }
  return { from: toIsoDate(input.from), to: toIsoDate(input.to) };
}

/** Clamp a range to bounds and resolve an inverted ordering. */
export function clampDateRange(range: DateRange, bounds: DateRange): DateRange {
  let from = range.from;
  let to = range.to;

  if (from !== null && bounds.from !== null && from < bounds.from) {
    from = bounds.from;
  }
  if (to !== null && bounds.to !== null && to > bounds.to) {
    to = bounds.to;
  }
  if (from !== null && to !== null && from > to) {
    to = from;
  }

  return { from, to };
}

/** Whether a range has two valid dates in chronological order. */
export function isDateRangeValid(range: DateRange): boolean {
  const from = toIsoDate(range.from);
  const to = toIsoDate(range.to);
  return from !== null && to !== null && from <= to;
}

/** Build a concrete range for a recognised preset. */
export function createPresetRange(
  preset: GeneratableDateRangePreset,
  now: Date = new Date(),
): DateRange {
  const to = now.toISOString().slice(0, 10);
  if (preset === "all") {
    return { from: null, to: null };
  }
  if (preset === "today") {
    return { from: to, to };
  }
  if (preset === "this-month") {
    return { from: `${to.slice(0, 7)}-01`, to };
  }

  const days = preset === "last-7-days" ? 7 : 30;
  const fromDate = new Date(now.getTime());
  fromDate.setUTCDate(fromDate.getUTCDate() - (days - 1));
  return { from: fromDate.toISOString().slice(0, 10), to };
}

/** Detect the preset matching a range, or `custom` / `invalid`. */
export function getDateRangePreset(
  range: DateRange,
  now: Date = new Date(),
): DateRangePreset {
  if (range.from === null && range.to === null) {
    return "all";
  }

  const from = toIsoDate(range.from);
  const to = toIsoDate(range.to);
  if (from === null || to === null || from > to) {
    return "invalid";
  }

  const today = now.toISOString().slice(0, 10);
  const spanDays =
    Math.round(
      (new Date(`${to}T00:00:00.000Z`).getTime() -
        new Date(`${from}T00:00:00.000Z`).getTime()) /
        MILLISECONDS_PER_DAY,
    ) + 1;

  if (to === today && spanDays === 1) {
    return "today";
  }
  if (to === today && spanDays === 7) {
    return "last-7-days";
  }
  if (to === today && spanDays === 30) {
    return "last-30-days";
  }

  if (from === `${to.slice(0, 7)}-01`) {
    return "this-month";
  }

  return "custom";
}

/** Produce a short, human-readable label for a range. */
export function formatDateRangeLabel(
  range: DateRange,
  options: DateRangeLabelOptions = {},
): string {
  const emptyLabel = options.emptyLabel ?? DEFAULT_EMPTY_LABEL;
  if (range.from === null && range.to === null) {
    return emptyLabel;
  }
  if (range.from !== null && range.to === null) {
    return `From ${range.from}`;
  }
  if (range.from === null && range.to !== null) {
    return `Until ${range.to}`;
  }
  if (range.from === range.to) {
    return range.from;
  }
  return `${range.from} – ${range.to}`;
}
