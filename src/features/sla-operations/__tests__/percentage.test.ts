/** ApexChain Frontend Test Suite */
/** Issue #920 — safe ratio/percentage arithmetic and formatting. */
import { describe, expect, it } from "vitest";

import {
  calculateDeltaPercentage,
  calculatePercentage,
  calculateRatio,
  clampPercentage,
  formatPercentage,
} from "@/features/sla-operations/utils/percentage";

describe("percentage utilities (#920)", () => {
  it("calculates ratios safely", () => {
    expect(calculateRatio(1, 4)).toBe(0.25);
    expect(calculateRatio(3, 3)).toBe(1);
    expect(calculateRatio(1, 0)).toBeNull();
    expect(calculateRatio(1, -2)).toBeNull();
    expect(calculateRatio(null, 4)).toBeNull();
    expect(calculateRatio(1, Number.POSITIVE_INFINITY)).toBeNull();
  });

  it("calculates and clamps percentages", () => {
    expect(calculatePercentage(1, 4)).toBe(25);
    expect(calculatePercentage(1, 0)).toBeNull();
    expect(clampPercentage(120)).toBe(100);
    expect(clampPercentage(-5)).toBe(0);
    expect(clampPercentage(Number.NaN)).toBeNull();
  });

  it("formats percentages with options and placeholders", () => {
    expect(formatPercentage(99.5)).toBe("99.5%");
    expect(formatPercentage(50, { decimals: 0 })).toBe("50%");
    expect(formatPercentage(null, { emptyLabel: "n/a" })).toBe("n/a");
  });

  it("calculates relative deltas", () => {
    expect(calculateDeltaPercentage(120, 100)).toBe(20);
    expect(calculateDeltaPercentage(80, 100)).toBe(-20);
    expect(calculateDeltaPercentage(100, 0)).toBeNull();
  });
});
