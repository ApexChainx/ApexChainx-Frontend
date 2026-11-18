/** ApexChain Frontend Test Suite */
/** Issue #925 — reusable form and filter validation helpers. */
import { describe, expect, it } from "vitest";

import {
  createValidationResult,
  isInRange,
  isNonEmptyString,
  isValidEmail,
  isValidIsoDate,
  isValidPagination,
  validateDateRange,
  validateRequiredFields,
} from "@/features/sla-operations/utils/validation";

describe("validation utilities (#925)", () => {
  it("validates strings, emails and dates", () => {
    expect(isNonEmptyString(" lagos ")).toBe(true);
    expect(isNonEmptyString("   ")).toBe(false);
    expect(isNonEmptyString(42)).toBe(false);
    expect(isValidEmail("operator@example.com")).toBe(true);
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidIsoDate("2026-01-01")).toBe(true);
    expect(isValidIsoDate("not-a-date")).toBe(false);
    expect(isValidIsoDate("")).toBe(false);
  });

  it("validates numeric ranges and pagination", () => {
    expect(isInRange(5, 0, 10)).toBe(true);
    expect(isInRange(11, 0, 10)).toBe(false);
    expect(isInRange(Number.NaN, 0, 10)).toBe(false);
    expect(isValidPagination(2, 20)).toBe(true);
    expect(isValidPagination(0, 20)).toBe(false);
    expect(isValidPagination(1, 0)).toBe(false);
  });

  it("validates optional date ranges", () => {
    expect(validateDateRange(null, null)).toBeNull();
    expect(validateDateRange("2026-01-01", "2026-01-31")).toBeNull();
    expect(validateDateRange("bad", null)).toBe("Start date is invalid");
    expect(validateDateRange(null, "bad")).toBe("End date is invalid");
    expect(validateDateRange("2026-02-01", "2026-01-01")).toBe(
      "Start date must be before end date",
    );
  });

  it("builds required-field error maps and results", () => {
    const errors = validateRequiredFields(
      { site_name: "  ", severity: "high" },
      ["site_name", "severity"],
    );
    expect(errors).toEqual({ site_name: "Required" });
    expect(createValidationResult(errors).valid).toBe(false);
    expect(createValidationResult({})).toEqual({ valid: true, errors: {} });
  });
});
