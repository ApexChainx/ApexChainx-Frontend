/** ApexChain Frontend Test Suite */
/** Issue #1019 — focused MTTR utility tests for the SLA operations workspace. */
import { describe, expect, it } from "vitest";

import { normalizeMttrMinutes } from "@/features/sla-operations/utils/mttr";

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
