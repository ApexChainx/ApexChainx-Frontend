/** ApexChain Frontend Test Suite */
/** Issue #926 — typed sorting comparators for operations datasets. */
import { describe, expect, it } from "vitest";

import {
  compareBooleans,
  compareDates,
  compareNumbers,
  compareOutagesByDetectedAt,
  comparePaymentsByAmount,
  compareStrings,
  compareWebhooksByDuration,
  combineComparators,
  sortBy,
} from "@/features/sla-operations/utils/sort";

describe("sorting utilities (#926)", () => {
  it("compares primitives with nullish values last", () => {
    expect(compareStrings("a", "b")).toBeLessThan(0);
    expect(compareNumbers(2, 10)).toBeLessThan(0);
    expect(compareBooleans(false, true)).toBeLessThan(0);
    expect(compareNumbers(null, 1)).toBeGreaterThan(0);
    expect(compareNumbers(1, undefined)).toBeLessThan(0);
    expect(compareNumbers(null, undefined)).toBe(0);
  });

  it("compares ISO timestamps chronologically", () => {
    expect(
      compareDates("2026-01-01T00:00:00Z", "2026-02-01T00:00:00Z"),
    ).toBeLessThan(0);
    expect(compareDates("2026-01-01", "2026-01-01")).toBe(0);
  });

  it("builds and combines item comparators", () => {
    const rows = [
      { group: "b", value: 2 },
      { group: "a", value: 5 },
      { group: "a", value: 1 },
    ];
    const comparator = combineComparators<
      (typeof rows)[number]
    >((a, b) => a.group.localeCompare(b.group), (a, b) => a.value - b.value);
    expect([...rows].sort(comparator).map((row) => row.value)).toEqual([
      1, 5, 2,
    ]);
  });

  it("sorts copies of domain datasets", () => {
    const outages = [
      { detected_at: "2026-01-01" },
      { detected_at: "2026-03-01" },
      { detected_at: "2026-02-01" },
    ];
    expect(
      sortBy(outages, compareOutagesByDetectedAt, "desc").map(
        (item) => item.detected_at,
      ),
    ).toEqual(["2026-03-01", "2026-02-01", "2026-01-01"]);
    expect(outages[0]?.detected_at).toBe("2026-01-01");

    expect(
      sortBy([{ amount: 10 }, { amount: 100 }], comparePaymentsByAmount).map(
        (item) => item.amount,
      ),
    ).toEqual([10, 100]);
    expect(
      sortBy(
        [{ duration_ms: 50 }, { duration_ms: null }, { duration_ms: 10 }],
        compareWebhooksByDuration,
      ).map((item) => item.duration_ms),
    ).toEqual([10, 50, null]);
  });
});
