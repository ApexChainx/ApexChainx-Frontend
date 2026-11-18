/** ApexChain Frontend Test Suite */
/** Issue #917 — currency normalisation and reward/penalty formatting. */
import { describe, expect, it } from "vitest";

import {
  formatCurrencyAmount,
  formatNetSettlement,
  formatPenalty,
  formatReward,
  normalizeAmount,
} from "@/features/sla-operations/utils/currency";

describe("currency utilities (#917)", () => {
  it("normalises numbers, formatted strings and accounting negatives", () => {
    expect(normalizeAmount(1234.5)).toBe(1234.5);
    expect(normalizeAmount("1,200")).toBe(1200);
    expect(normalizeAmount("(1,200)")).toBe(-1200);
    expect(normalizeAmount("-50")).toBe(-50);
  });

  it("returns null for nullish and invalid input", () => {
    expect(normalizeAmount(null)).toBeNull();
    expect(normalizeAmount(undefined)).toBeNull();
    expect(normalizeAmount("  ")).toBeNull();
    expect(normalizeAmount("abc")).toBeNull();
  });

  it("formats amounts with signs and placeholders", () => {
    expect(formatCurrencyAmount(1234.5)).toBe("$1,234.50");
    expect(formatCurrencyAmount(-50)).toBe("-$50.00");
    expect(formatCurrencyAmount(null, { emptyLabel: "n/a" })).toBe("n/a");
  });

  it("formats rewards, penalties and net settlement", () => {
    expect(formatReward(100)).toBe("+$100.00");
    expect(formatPenalty(50)).toBe("-$50.00");
    expect(formatPenalty(-50)).toBe("-$50.00");
    expect(formatNetSettlement(120)).toBe("+$120.00");
    expect(formatNetSettlement(-30)).toBe("-$30.00");
  });

  it("honours currency, locale and compact options", () => {
    expect(
      formatCurrencyAmount(10, { currency: "EUR", locale: "de-DE" }),
    ).toContain("10");
    expect(formatCurrencyAmount(1200, { compact: true })).toBe("$1.2K");
  });
});
