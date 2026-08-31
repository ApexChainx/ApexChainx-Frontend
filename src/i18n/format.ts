/** ApexChain Network Operations Intelligence Platform */

import type { Locale } from './config';

/**
 * Locale-aware number formatting. Uses the current app locale so values are
 * rendered with the correct decimal/thousand separators (e.g. pt uses comma
 * as the decimal separator) instead of a hardcoded en-US format.
 */
export function formatNumber(
  value: number,
  locale: Locale,
  options: Intl.NumberFormatOptions = {},
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

/**
 * Locale-aware date/time formatting. Uses the current app locale so dates
 * render with the correct order and month/day names for the active language.
 */
export function formatDate(
  value: Date | number | string,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' },
): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(locale, options).format(date);
}
