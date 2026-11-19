/** ApexChain Frontend Test Suite */
/** Issue #964 — settlement reward/penalty/net breakdown. */
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  computeSettlementBreakdown,
  useSettlementBreakdown,
} from "@/features/sla-operations/hooks/useSettlementBreakdown";
import type {
  SettlementLineItem,
  SettlementLineItemKind,
} from "@/features/sla-operations/types/settlement-summary";

function item(
  id: string,
  kind: SettlementLineItemKind,
  amount: number,
  currency = "USD",
): SettlementLineItem {
  return { id, kind, amount, currency, label: id, createdAt: "2026-05-01T00:00:00Z" };
}

describe("computeSettlementBreakdown (#964)", () => {
  it("totals rewards, penalties and adjustments into a net amount", () => {
    const result = computeSettlementBreakdown([
      item("r1", "reward", 100),
      item("r2", "reward", 50),
      item("p1", "penalty", -30),
      item("a1", "adjustment", -5),
      item("a2", "adjustment", 2),
    ]);

    expect(result.currency).toBe("USD");
    expect(result.rewardTotal).toBe(150);
    expect(result.penaltyTotal).toBe(30);
    expect(result.adjustmentTotal).toBe(-3);
    expect(result.netAmount).toBe(117);
    expect(result.includedCount).toBe(5);
    expect(result.isEmpty).toBe(false);
    expect(result.groups.map((group) => [group.kind, group.count])).toEqual([
      ["reward", 2],
      ["penalty", 1],
      ["adjustment", 2],
    ]);
  });

  it("treats penalty magnitude the same whichever sign the backend used", () => {
    expect(computeSettlementBreakdown([item("p", "penalty", 40)]).penaltyTotal).toBe(40);
    expect(computeSettlementBreakdown([item("p", "penalty", -40)]).penaltyTotal).toBe(40);
    expect(computeSettlementBreakdown([item("p", "penalty", -40)]).netAmount).toBe(-40);
  });

  it("does not let a negative reward reduce the total", () => {
    expect(computeSettlementBreakdown([item("r", "reward", -10)]).rewardTotal).toBe(0);
  });

  it("hides floating point noise", () => {
    const result = computeSettlementBreakdown([
      item("r1", "reward", 0.1),
      item("r2", "reward", 0.2),
    ]);
    expect(result.rewardTotal).toBe(0.3);
    expect(result.netAmount).toBe(0.3);
  });

  it("returns an empty breakdown for no items", () => {
    for (const input of [[], null, undefined]) {
      const result = computeSettlementBreakdown(input);
      expect(result.isEmpty).toBe(true);
      expect(result.currency).toBeNull();
      expect(result.netAmount).toBe(0);
      expect(result.groups).toHaveLength(3);
      expect(result.groups.every((group) => group.count === 0)).toBe(true);
    }
  });

  it("skips and counts items with non-finite amounts", () => {
    const result = computeSettlementBreakdown([
      item("r1", "reward", 10),
      item("bad1", "reward", Number.NaN),
      item("bad2", "penalty", Number.POSITIVE_INFINITY),
    ]);
    expect(result.invalidCount).toBe(2);
    expect(result.includedCount).toBe(1);
    expect(result.netAmount).toBe(10);
  });

  it("totals in the first currency and excludes the others", () => {
    const result = computeSettlementBreakdown([
      item("r1", "reward", 10, "USD"),
      item("r2", "reward", 99, "EUR"),
      item("p1", "penalty", -4, "usd"),
    ]);
    expect(result.currency).toBe("USD");
    expect(result.rewardTotal).toBe(10);
    expect(result.penaltyTotal).toBe(4);
    expect(result.excludedCount).toBe(1);
    expect(result.currencies).toEqual(["USD", "EUR"]);
    expect(result.hasMixedCurrencies).toBe(true);
  });

  it("honours an explicit currency", () => {
    const result = computeSettlementBreakdown(
      [item("r1", "reward", 10, "USD"), item("r2", "reward", 99, "EUR")],
      { currency: "eur" },
    );
    expect(result.currency).toBe("EUR");
    expect(result.rewardTotal).toBe(99);
    expect(result.excludedCount).toBe(1);
  });

  it("keeps the included items in each group", () => {
    const reward = item("r1", "reward", 10);
    const result = computeSettlementBreakdown([reward]);
    expect(result.groups[0]?.items).toEqual([reward]);
  });

  it("does not mutate its input", () => {
    const items = [item("r1", "reward", 10), item("p1", "penalty", -3)];
    const copy = JSON.parse(JSON.stringify(items)) as typeof items;
    computeSettlementBreakdown(items);
    expect(items).toEqual(copy);
  });
});

describe("useSettlementBreakdown (#964)", () => {
  it("returns the computed breakdown", () => {
    const items = [item("r1", "reward", 10), item("p1", "penalty", -4)];
    const { result } = renderHook(() => useSettlementBreakdown(items));
    expect(result.current.netAmount).toBe(6);
  });

  it("is memoised for the same inputs and recomputes when they change", () => {
    const items = [item("r1", "reward", 10)];
    const { result, rerender } = renderHook(
      ({ list, currency }) => useSettlementBreakdown(list, { currency }),
      { initialProps: { list: items, currency: undefined as string | undefined } },
    );
    const first = result.current;

    rerender({ list: items, currency: undefined });
    expect(result.current).toBe(first);

    rerender({ list: [...items, item("r2", "reward", 5)], currency: undefined });
    expect(result.current).not.toBe(first);
    expect(result.current.rewardTotal).toBe(15);
  });
});
