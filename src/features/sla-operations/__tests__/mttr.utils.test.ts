/** ApexChain Frontend Test Suite */
/** Issue #1019 — focused MTTR utility tests for the SLA operations workspace. */
import { describe, expect, it } from "vitest";

import {
  clampMttrMinutes,
  formatMttr,
  normalizeMttrMinutes,
} from "@/features/sla-operations/utils/mttr";

describe("MTTR normalization (#1019)", () => {
  it("accepts finite non-negative numbers unchanged", () => {
    expect(normalizeMttrMinutes(0)).toBe(0);
    expect(normalizeMttrMinutes(90)).toBe(90);
    expect(normalizeMttrMinutes(1.5)).toBe(1.5);
    expect(normalizeMttrMinutes(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER);
  });

  it("parses numeric strings and trims surrounding whitespace", () => {
    expect(normalizeMttrMinutes("90")).toBe(90);
    expect(normalizeMttrMinutes(" 90 ")).toBe(90);
    expect(normalizeMttrMinutes("1e2")).toBe(100);
    expect(normalizeMttrMinutes("0")).toBe(0);
  });

  it("parses compound hour and minute strings", () => {
    expect(normalizeMttrMinutes("1h 30m")).toBe(90);
    expect(normalizeMttrMinutes("1h30m")).toBe(90);
    expect(normalizeMttrMinutes("1 H 30 M")).toBe(90);
    expect(normalizeMttrMinutes("1h")).toBe(60);
    expect(normalizeMttrMinutes("1.5h")).toBe(90);
    expect(normalizeMttrMinutes("30m")).toBe(30);
    expect(normalizeMttrMinutes("0h 0m")).toBe(0);
  });

  it("sums compound parts without imposing a 60-minute cap", () => {
    expect(normalizeMttrMinutes("1h 90m")).toBe(150);
  });

  it("returns null for nullish, blank, invalid, and negative inputs", () => {
    expect(normalizeMttrMinutes(null)).toBeNull();
    expect(normalizeMttrMinutes(undefined)).toBeNull();
    expect(normalizeMttrMinutes("")).toBeNull();
    expect(normalizeMttrMinutes("   ")).toBeNull();
    expect(normalizeMttrMinutes("h")).toBeNull();
    expect(normalizeMttrMinutes("not-a-duration")).toBeNull();
    expect(normalizeMttrMinutes("-5")).toBeNull();
    expect(normalizeMttrMinutes(-5)).toBeNull();
  });

  it("returns null for non-finite numbers", () => {
    expect(normalizeMttrMinutes(Number.NaN)).toBeNull();
    expect(normalizeMttrMinutes(Number.POSITIVE_INFINITY)).toBeNull();
    expect(normalizeMttrMinutes("Infinity")).toBeNull();
  });
});

describe("MTTR clamping (#1019)", () => {
  it("leaves values inside the range untouched", () => {
    expect(clampMttrMinutes(60, 0, 120)).toBe(60);
    expect(clampMttrMinutes("1h 30m", 0, 120)).toBe(90);
  });

  it("clamps above the upper bound and below the lower bound", () => {
    expect(clampMttrMinutes(200, 0, 120)).toBe(120);
    expect(clampMttrMinutes(10, 30, 60)).toBe(30);
  });

  it("normalizes reversed bounds before clamping", () => {
    expect(clampMttrMinutes(90, 120, 30)).toBe(90);
    expect(clampMttrMinutes(200, 120, 30)).toBe(120);
    expect(clampMttrMinutes(5, 120, 30)).toBe(30);
  });

  it("keeps identical bounds stable", () => {
    expect(clampMttrMinutes(0, 5, 5)).toBe(5);
    expect(clampMttrMinutes(10, 5, 5)).toBe(5);
  });

  it("propagates invalid values as null", () => {
    expect(clampMttrMinutes(null, 0, 120)).toBeNull();
    expect(clampMttrMinutes(undefined, 0, 120)).toBeNull();
    expect(clampMttrMinutes("bad", 0, 120)).toBeNull();
    expect(clampMttrMinutes(-1, 0, 120)).toBeNull();
  });
});

describe("MTTR compact formatting (#1019)", () => {
  it("renders minutes and hours in the documented compact form", () => {
    expect(formatMttr(0)).toBe("0m");
    expect(formatMttr(30)).toBe("30m");
    expect(formatMttr(60)).toBe("1h");
    expect(formatMttr(90)).toBe("1h 30m");
    expect(formatMttr("1h 5m")).toBe("1h 5m");
    expect(formatMttr(120)).toBe("2h");
  });

  it("rounds fractional minutes before deriving hours and minutes", () => {
    expect(formatMttr(29.4)).toBe("29m");
    expect(formatMttr(29.6)).toBe("30m");
    expect(formatMttr(59.6)).toBe("1h");
    expect(formatMttr(89.6)).toBe("1h 30m");
  });

  it("uses the default placeholder for unusable values", () => {
    expect(formatMttr(null)).toBe("\u2014");
    expect(formatMttr(undefined)).toBe("\u2014");
    expect(formatMttr("")).toBe("\u2014");
    expect(formatMttr("bad")).toBe("\u2014");
    expect(formatMttr(-1)).toBe("\u2014");
  });

  it("honors a custom empty label", () => {
    expect(formatMttr(null, { emptyLabel: "pending" })).toBe("pending");
    expect(formatMttr("bad", { emptyLabel: "n/a" })).toBe("n/a");
  });
});

describe("MTTR formatting with seconds (#1019)", () => {
  it("converts minute inputs into hours, minutes, and seconds", () => {
    expect(formatMttr(90, { includeSeconds: true })).toBe("1h 30m 0s");
    expect(formatMttr(60, { includeSeconds: true })).toBe("1h 0m 0s");
    expect(formatMttr(1.5, { includeSeconds: true })).toBe("1m 30s");
    expect(formatMttr(0, { includeSeconds: true })).toBe("0s");
  });

  it("rounds sub-minute values to whole seconds", () => {
    expect(formatMttr(0.4, { includeSeconds: true })).toBe("24s");
    expect(formatMttr(0.008, { includeSeconds: true })).toBe("0s");
  });

  it("uses the placeholder when seconds are requested for invalid input", () => {
    expect(formatMttr(null, { includeSeconds: true })).toBe("\u2014");
    expect(formatMttr("bad", { includeSeconds: true, emptyLabel: "n/a" })).toBe("n/a");
  });
});
