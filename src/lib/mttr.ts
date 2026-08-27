/**
 * MTTR validation helper shared by every resolve flow in the app.
 *
 * The raw input string is validated instead of the `Number(...)` result,
 * because `Number("")` is `0` — an empty or whitespace-only input would
 * otherwise pass as a legitimate zero MTTR.
 */

export const MTTR_VALIDATION_ERROR = "MTTR must be a non-negative number.";

/**
 * Parse a raw MTTR input string into a non-negative number of minutes.
 *
 * Returns `null` when the input is empty/whitespace, not a finite number,
 * or negative. A literal `"0"` is a valid result (0 minutes is allowed
 * when it is explicitly intended).
 */
export function parseMttrInput(raw: string): number | null {
  if (raw.trim() === "") {
    return null;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}