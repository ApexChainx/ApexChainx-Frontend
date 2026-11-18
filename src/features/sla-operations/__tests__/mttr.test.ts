/** ApexChain Frontend Test Suite */
/** Issue #915 — MTTR normalisation, clamping and formatting. */
import { describe, expect, it } from "vitest";

import {
  clampMttrMinutes,
  formatMttr,
  formatMttrHours,
  isWithinMttrThreshold,
  normalizeMttrMinutes,
} from "@/features/sla-operations/utils/mttr";

describe("MTTR utilities (#915)", () => {
  it("normalises numbers, numeric strings and compound durations", () => {
    expect(normalizeMttrMinutes(90)).toBe(90);
    expect(normalizeMttrMinutes("90")).toBe(90);
    expect(normalizeMttrMinutes("1h 30m")).toBe(90);
    expect(normalizeMttrMinutes("1.5h")).toBe(90);
    expect(normalizeMttrMinutes("30m")).toBe(30);
  });

  it("returns null for nullish, empty, negative and invalid input", () => {
    expect(normalizeMttrMinutes(null)).toBeNull();
    expect(normalizeMttrMinutes(undefined)).toBeNull();
    expect(normalizeMttrMinutes("  ")).toBeNull();
    expect(normalizeMttrMinutes(-5)).toBeNull();
    expect(normalizeMttrMinutes("not-a-duration")).toBeNull();
  });

  it("clamps into range and tolerates reversed bounds", () => {
    expect(clampMttrMinutes(200, 0, 120)).toBe(120);
    expect(clampMttrMinutes(10, 30, 60)).toBe(30);
    expect(clampMttrMinutes(90, 120, 30)).toBe(90);
    expect(clampMttrMinutes("bad", 0, 120)).toBeNull();
  });

  it("formats compact durations and placeholders", () => {
    expect(formatMttr(90)).toBe("1h 30m");
    expect(formatMttr(60)).toBe("1h");
    expect(formatMttr(30)).toBe("30m");
    expect(formatMttr(0)).toBe("0m");
    expect(formatMttr(null)).toBe("\u2014");
    expect(formatMttr(undefined, { emptyLabel: "pending" })).toBe("pending");
    expect(formatMttr(90, { includeSeconds: true })).toBe("1h 30m 0s");
  });

  it("formats hours and evaluates thresholds", () => {
    expect(formatMttrHours(90)).toBe("1.5h");
    expect(formatMttrHours(null, { emptyLabel: "n/a" })).toBe("n/a");
    expect(isWithinMttrThreshold(60, 90)).toBe(true);
    expect(isWithinMttrThreshold(120, 90)).toBe(false);
    expect(isWithinMttrThreshold(null, 90)).toBe(false);
  });
});
