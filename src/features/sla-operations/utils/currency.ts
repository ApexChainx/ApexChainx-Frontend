/** ApexChain Network Operations Intelligence Platform */
/**
 * Currency and amount formatting utilities (Issue #917).
 *
 * Pure helpers for rewards, penalties and net settlement amounts. All public
 * functions accept nullish/invalid input and return a stable placeholder, so
 * tables and KPI cards never render `NaN` or `undefined` to operators.
 */

const DEFAULT_CURRENCY = "USD";
const DEFAULT_LOCALE = "en-US";
const DEFAULT_EMPTY_LABEL = "\u2014";

/** Options controlling currency rendering. */
export interface CurrencyFormatOptions {
  /** ISO 4217 currency code. Defaults to "USD". */
  currency?: string | undefined;
  /** BCP 47 locale tag. Defaults to "en-US". */
  locale?: string | undefined;
  /** Maximum number of fractional digits. Defaults to 2. */
  maximumFractionDigits?: number | undefined;
  /** Use compact notation, e.g. "1.2K". */
  compact?: boolean | undefined;
  /** Prefix positive amounts with "+". */
  showSign?: boolean | undefined;
  /** Placeholder for nullish/invalid input. */
  emptyLabel?: string | undefined;
}

/**
 * Resolve an amount to a finite number.
 *
 * Accepts numbers, numeric strings (with optional thousands separators) and
 * accounting-style negatives such as `"(1,200)"`.
 */
export function normalizeAmount(
  value: number | string | null | undefined,
): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const negative = /^\(.*\)$/.test(trimmed);
  const cleaned = trimmed
    .replace(/^\((.*)\)$/, "$1")
    .replace(/,/g, "")
    .replace(/^[+-]/, "")
    .trim();
  if (!cleaned) {
    return null;
  }

  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return negative ? -parsed : parsed;
}

/** Format an amount as a currency string. */
export function formatCurrencyAmount(
  value: number | string | null | undefined,
  options: CurrencyFormatOptions = {},
): string {
  const emptyLabel = options.emptyLabel ?? DEFAULT_EMPTY_LABEL;
  const amount = normalizeAmount(value);
  if (amount === null) {
    return emptyLabel;
  }

  const formatter = new Intl.NumberFormat(options.locale ?? DEFAULT_LOCALE, {
    style: "currency",
    currency: options.currency ?? DEFAULT_CURRENCY,
    notation: options.compact ? "compact" : "standard",
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
  });

  const formatted = formatter.format(Math.abs(amount));
  if (amount < 0) {
    return `-${formatted}`;
  }
  if ((options.showSign ?? false) && amount > 0) {
    return `+${formatted}`;
  }
  return formatted;
}

/** Format a reward amount, always showing a leading "+" for positives. */
export function formatReward(
  value: number | string | null | undefined,
  options: CurrencyFormatOptions = {},
): string {
  return formatCurrencyAmount(value, { ...options, showSign: true });
}

/** Format a penalty as a negative currency amount. */
export function formatPenalty(
  value: number | string | null | undefined,
  options: CurrencyFormatOptions = {},
): string {
  const amount = normalizeAmount(value);
  if (amount === null) {
    return options.emptyLabel ?? DEFAULT_EMPTY_LABEL;
  }
  return formatCurrencyAmount(-Math.abs(amount), options);
}

/** Format a signed net settlement amount. */
export function formatNetSettlement(
  value: number | string | null | undefined,
  options: CurrencyFormatOptions = {},
): string {
  return formatCurrencyAmount(value, { ...options, showSign: true });
}
