/** ApexChain Frontend Test Suite */
/** Issue #969 — KPI card view models derived from an SLA summary. */
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  computeKpiCards,
  DEFAULT_COMPLIANCE_TARGET,
  useKpiCards,
} from "@/features/sla-operations/hooks/useKpiCards";
import type { SlaKpiSummary } from "@/features/sla-operations/types/sla-metrics";

function summary(overrides: Partial<SlaKpiSummary> = {}): SlaKpiSummary {
  return {
    totalEvaluated: 100,
    totalMet: 99,
    violationCount: 1,
    mttrMinutes: 45,
    mttrThresholdMinutes: 60,
    complianceRate: 99.5,
    netSettlement: { amount: 1250, currency: "USD" },
    totalRewards: { amount: 1500, currency: "USD" },
    totalPenalties: { amount: 250, currency: "USD" },
    complianceTrend: [],
    thresholdDeltas: [],
    ...overrides,
  };
}

function byId(cards: ReturnType<typeof computeKpiCards>, id: string) {
  const card = cards.find((candidate) => candidate.id === id);
  if (!card) {
    throw new Error(`missing card ${id}`);
  }
  return card;
}

describe("computeKpiCards (#969)", () => {
  it("returns no cards without a summary", () => {
    expect(computeKpiCards(null)).toEqual([]);
    expect(computeKpiCards(undefined)).toEqual([]);
  });

  it("builds the four cards in a fixed order", () => {
    const cards = computeKpiCards(summary());
    expect(cards.map((card) => card.id)).toEqual([
      "compliance-rate",
      "mttr",
      "violations",
      "net-settlement",
    ]);
  });

  it("formats values and keeps raw values for sorting", () => {
    const cards = computeKpiCards(summary());
    expect(byId(cards, "compliance-rate")).toMatchObject({
      displayValue: "99.5%",
      rawValue: 99.5,
      variant: "percentage",
    });
    expect(byId(cards, "mttr")).toMatchObject({
      displayValue: "45m",
      rawValue: 45,
      variant: "duration",
    });
    expect(byId(cards, "violations")).toMatchObject({ displayValue: "1", rawValue: 1 });
    expect(byId(cards, "net-settlement").displayValue).toContain("1,250");
    expect(byId(cards, "net-settlement").rawValue).toBe(1250);
  });

  it("judges compliance against the target, default 99", () => {
    expect(DEFAULT_COMPLIANCE_TARGET).toBe(99);
    expect(byId(computeKpiCards(summary({ complianceRate: 99 })), "compliance-rate").state).toBe(
      "positive",
    );
    expect(byId(computeKpiCards(summary({ complianceRate: 98.9 })), "compliance-rate").state).toBe(
      "negative",
    );
    expect(
      byId(computeKpiCards(summary({ complianceRate: 95 }), { complianceTarget: 90 }), "compliance-rate")
        .state,
    ).toBe("positive");
  });

  it("judges MTTR against the summary threshold, lower being better", () => {
    expect(byId(computeKpiCards(summary({ mttrMinutes: 60 })), "mttr").state).toBe("positive");
    expect(byId(computeKpiCards(summary({ mttrMinutes: 61 })), "mttr").state).toBe("negative");
    expect(byId(computeKpiCards(summary()), "mttr").helperText).toBe("Target ≤ 1h");
  });

  it("marks violations and net settlement by sign", () => {
    expect(byId(computeKpiCards(summary({ violationCount: 0 })), "violations").state).toBe("positive");
    expect(byId(computeKpiCards(summary({ violationCount: 3 })), "violations").state).toBe("negative");

    const net = (amount: number) =>
      byId(
        computeKpiCards(summary({ netSettlement: { amount, currency: "USD" } })),
        "net-settlement",
      ).state;
    expect(net(10)).toBe("positive");
    expect(net(-10)).toBe("negative");
    expect(net(0)).toBe("neutral");
  });

  it("uses a placeholder and neutral state for unusable values", () => {
    const cards = computeKpiCards(
      summary({
        complianceRate: Number.NaN,
        mttrMinutes: Number.POSITIVE_INFINITY,
        violationCount: Number.NaN,
        netSettlement: { amount: Number.NaN, currency: "USD" },
      }),
    );
    for (const card of cards) {
      expect(card.state).toBe("neutral");
      expect(card.rawValue).toBe(0);
      expect(card.displayValue).toBe("—");
    }
  });

  it("adds deltas against the previous period", () => {
    const cards = computeKpiCards(summary(), {
      previous: summary({
        complianceRate: 99.0,
        mttrMinutes: 60,
        violationCount: 1,
        netSettlement: { amount: 1000, currency: "USD" },
      }),
    });
    expect(byId(cards, "compliance-rate").delta).toEqual({
      value: 0.5,
      direction: "up",
      comparisonLabel: "vs previous period",
    });
    expect(byId(cards, "mttr").delta).toMatchObject({ value: -15, direction: "down" });
    expect(byId(cards, "violations").delta).toMatchObject({ value: 0, direction: "flat" });
    expect(byId(cards, "net-settlement").delta).toMatchObject({ value: 250, direction: "up" });
  });

  it("omits deltas without a previous period or with unusable previous values", () => {
    expect(byId(computeKpiCards(summary()), "mttr").delta).toBeUndefined();
    const cards = computeKpiCards(summary(), { previous: summary({ mttrMinutes: Number.NaN }) });
    expect(byId(cards, "mttr").delta).toBeUndefined();
  });

  it("supports a custom comparison label and currency", () => {
    const cards = computeKpiCards(summary(), {
      previous: summary({ complianceRate: 90 }),
      comparisonLabel: "vs last month",
      currency: "EUR",
    });
    expect(byId(cards, "compliance-rate").delta?.comparisonLabel).toBe("vs last month");
    expect(byId(cards, "net-settlement").displayValue).toContain("€");
  });

  it("does not leave undefined optional properties on cards", () => {
    const card = byId(computeKpiCards(summary({ mttrThresholdMinutes: Number.NaN })), "mttr");
    expect("helperText" in card).toBe(false);
    expect("delta" in card).toBe(false);
  });
});

describe("useKpiCards (#969)", () => {
  it("returns cards and an empty flag", () => {
    const { result } = renderHook(() => useKpiCards(summary()));
    expect(result.current.cards).toHaveLength(4);
    expect(result.current.isEmpty).toBe(false);

    const empty = renderHook(() => useKpiCards(null));
    expect(empty.result.current.cards).toEqual([]);
    expect(empty.result.current.isEmpty).toBe(true);
  });

  it("is memoised for the same inputs and recomputes when they change", () => {
    const data = summary();
    const { result, rerender } = renderHook(
      ({ value, target }) => useKpiCards(value, { complianceTarget: target }),
      { initialProps: { value: data, target: 99 as number | undefined } },
    );
    const first = result.current;

    rerender({ value: data, target: 99 });
    expect(result.current).toBe(first);

    rerender({ value: data, target: 90 });
    expect(result.current).not.toBe(first);
  });
});
