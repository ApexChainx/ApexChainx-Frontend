/** ApexChain Frontend Test Suite */
/** Issue #1019 — focused MTTR utility tests for the SLA operations workspace. */
import { describe, expect, it } from "vitest";

import {
  clampMttrMinutes,
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
