/**
 * Locale-aware date and number formatting helpers.
 *
 * These back the `formatDate` / `formatNumber` methods exposed by the i18n
 * provider. They are pure functions so they can be unit-tested directly and
 * used outside the React tree. Every formatter falls back to `en` when a
 * locale (or a date) is unsupported by the runtime's `Intl` surface, so a
 * malformed value can never throw from a render.
 */

/** Format a date per a locale's conventions (date-only by default). */
export function formatDate(
  value: Date | string | number | null | undefined,
  locale: string = "en",
  options?: Intl.DateTimeFormatOptions,
): string {
  if (value === null || value === undefined || value === "") return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return new Intl.DateTimeFormat(locale, options).format(date);
  } catch {
    return new Intl.DateTimeFormat("en", options).format(date);
  }
}

/** Format a number per a locale's conventions (grouping + decimal separators). */
export function formatNumber(
  value: number,
  locale: string = "en",
  options?: Intl.NumberFormatOptions,
): string {
  if (Number.isNaN(value) || !Number.isFinite(value)) return "0";
  try {
    return new Intl.NumberFormat(locale, options).format(value);
  } catch {
    return new Intl.NumberFormat("en", options).format(value);
  }
}
