/** ApexChain Frontend Test Suite */
/** Issue #918 — date range parsing, clamping, presets and labels. */
import { describe, expect, it } from "vitest";

import {
  clampDateRange,
  createPresetRange,
  formatDateRangeLabel,
  getDateRangePreset,
  isDateRangeValid,
  parseDateRange,
} from "@/features/sla-operations/utils/date-range";

const NOW = new Date("2026-01-15T00:00:00.000Z");

describe("date range utilities (#918)", () => {
  it("parses object and single-date inputs to ISO dates", () => {
    expect(
      parseDateRange({ from: "2026-01-01T12:00:00Z", to: "2026-01-31" }),
    ).toEqual({ from: "2026-01-01", to: "2026-01-31" });
    expect(parseDateRange("2026-01-05")).toEqual({
      from: "2026-01-05",
      to: "2026-01-05",
    });
  });

  it("handles nullish and invalid input predictably", () => {
    expect(parseDateRange(null)).toEqual({ from: null, to: null });
    expect(parseDateRange(undefined)).toEqual({ from: null, to: null });
    expect(parseDateRange({ from: "bad", to: "2026-01-01" })).toEqual({
      from: null,
      to: "2026-01-01",
    });
  });

  it("clamps to bounds and resolves inverted ranges", () => {
    expect(
      clampDateRange(
        { from: "2025-12-01", to: "2026-03-01" },
        { from: "2026-01-01", to: "2026-02-01" },
      ),
    ).toEqual({ from: "2026-01-01", to: "2026-02-01" });
    expect(
      clampDateRange(
        { from: "2026-02-01", to: "2026-01-01" },
        { from: null, to: null },
      ),
    ).toEqual({ from: "2026-02-01", to: "2026-02-01" });
  });

  it("validates ranges", () => {
    expect(isDateRangeValid({ from: "2026-01-01", to: "2026-01-31" })).toBe(
      true,
    );
    expect(isDateRangeValid({ from: "2026-01-31", to: "2026-01-01" })).toBe(
      false,
    );
    expect(isDateRangeValid({ from: null, to: "2026-01-01" })).toBe(false);
  });

  it("creates and detects presets", () => {
    expect(createPresetRange("today", NOW)).toEqual({
      from: "2026-01-15",
      to: "2026-01-15",
    });
    expect(createPresetRange("all", NOW)).toEqual({ from: null, to: null });
    expect(
      getDateRangePreset(createPresetRange("last-7-days", NOW), NOW),
    ).toBe("last-7-days");
    expect(
      getDateRangePreset(createPresetRange("last-30-days", NOW), NOW),
    ).toBe("last-30-days");
    expect(getDateRangePreset({ from: "2026-01-01", to: "2026-01-10" }, NOW)).toBe(
      "this-month",
    );
    expect(getDateRangePreset({ from: null, to: null }, NOW)).toBe("all");
    expect(getDateRangePreset({ from: "2026-02-01", to: "2026-01-01" }, NOW)).toBe(
      "invalid",
    );
  });

  it("formats readable labels", () => {
    expect(formatDateRangeLabel({ from: null, to: null })).toBe("All time");
    expect(formatDateRangeLabel({ from: "2026-01-01", to: "2026-01-01" })).toBe(
      "2026-01-01",
    );
    expect(formatDateRangeLabel({ from: "2026-01-01", to: "2026-01-31" })).toBe(
      "2026-01-01 – 2026-01-31",
    );
    expect(
      formatDateRangeLabel({ from: "2026-01-01", to: null }),
    ).toBe("From 2026-01-01");
  });
});
