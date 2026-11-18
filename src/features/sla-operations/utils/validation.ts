/** ApexChain Network Operations Intelligence Platform */
/**
 * Input validation utilities (Issue #925).
 *
 * Reusable, side-effect-free validators for SLA operations forms and filters.
 * They return booleans, error maps or messages rather than throwing so UI
 * layers can render inline feedback consistently.
 */

/** Result of validating a form or filter group. */
export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}/;

/** Whether a value is a string with at least one non-whitespace character. */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** Whether a value is a syntactically valid ISO date string. */
export function isValidIsoDate(value: unknown): boolean {
  if (!isNonEmptyString(value) || !ISO_DATE_PATTERN.test(value.trim())) {
    return false;
  }
  return !Number.isNaN(new Date(value).getTime());
}

/** Whether a value looks like an email address. */
export function isValidEmail(value: unknown): boolean {
  return isNonEmptyString(value) && EMAIL_PATTERN.test(value.trim());
}

/** Whether a finite number lies within an inclusive range. */
export function isInRange(value: number, min: number, max: number): boolean {
  return Number.isFinite(value) && value >= min && value <= max;
}

/** Whether page and page-size values are usable for pagination. */
export function isValidPagination(page: number, pageSize: number): boolean {
  return (
    Number.isInteger(page) &&
    page >= 1 &&
    Number.isInteger(pageSize) &&
    pageSize >= 1
  );
}

/**
 * Validate an optional date range.
 *
 * Returns `null` when the range is valid (including when both bounds are
 * empty), or a human-readable error message otherwise.
 */
export function validateDateRange(from: unknown, to: unknown): string | null {
  const hasFrom = isNonEmptyString(from);
  const hasTo = isNonEmptyString(to);

  if (!hasFrom && !hasTo) {
    return null;
  }
  if (hasFrom && !isValidIsoDate(from)) {
    return "Start date is invalid";
  }
  if (hasTo && !isValidIsoDate(to)) {
    return "End date is invalid";
  }
  if (
    hasFrom &&
    hasTo &&
    new Date(String(from)).getTime() > new Date(String(to)).getTime()
  ) {
    return "Start date must be before end date";
  }
  return null;
}

/** Build an error map for required fields that are missing or blank. */
export function validateRequiredFields(
  values: Record<string, unknown>,
  fields: readonly string[],
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of fields) {
    const value = values[field];
    if (
      value === null ||
      value === undefined ||
      (typeof value === "string" && value.trim().length === 0)
    ) {
      errors[field] = "Required";
    }
  }
  return errors;
}

/** Wrap an error map in a `ValidationResult`. */
export function createValidationResult(
  errors: Record<string, string>,
): ValidationResult {
  return { valid: Object.keys(errors).length === 0, errors };
}
