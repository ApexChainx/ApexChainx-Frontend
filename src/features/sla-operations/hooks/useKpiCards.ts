/** ApexChain Network Operations Intelligence Platform */
/**
 * KPI cards derivation hook (Issue #969).
 *
 * Turns an `SlaKpiSummary` into the `KpiCardModel` view models rendered by the
 * KPI overview: SLA compliance, MTTR, violations and net settlement. Values
 * are preformatted with the workspace utilities, the semantic state comes from
 * the threshold comparison, and, when the previous period's summary is given,
 * each card carries a delta against it.
 *
 * Choices worth knowing:
 * - Compliance is judged against `complianceTarget` (default 99, an
 *   assumption: pass the configured SLA target when it is known). MTTR is
 *   judged against the summary's own `mttrThresholdMinutes`.
 * - A value that is missing or not finite renders the placeholder with a
 *   neutral state and a raw value of 0.
 * - A delta's direction is the direction of the number (up, down, flat), not
 *   whether the change is good: a lower MTTR is "down".
 */
import { useMemo } from "react";

import type { KpiCardModel, KpiDelta, KpiSemanticState, KpiTrendDirection } from "../types/kpi";
import type { SlaKpiSummary } from "../types/sla-metrics";
import { formatNetSettlement } from "../utils/currency";
import { formatMttr } from "../utils/mttr";
import { formatPercentage } from "../utils/percentage";
import { compareToThreshold } from "../utils/threshold";

/** Compliance target used when none is given, in percent. */
export const DEFAULT_COMPLIANCE_TARGET = 99;

const DEFAULT_COMPARISON_LABEL = "vs previous period";

/** Changes smaller than this are treated as no change. */
const FLAT_EPSILON = 1e-9;

export interface UseKpiCardsOptions {
  /** Compliance rate (percent) that counts as meeting the SLA. */
  complianceTarget?: number | undefined;
  /** Currency override for the net settlement card. Defaults to the summary's. */
  currency?: string | undefined;
  /** Summary of the previous period, to show deltas. */
  previous?: SlaKpiSummary | null | undefined;
  comparisonLabel?: string | undefined;
}

export interface UseKpiCardsResult {
  cards: KpiCardModel[];
  /** True when there was no summary to derive cards from. */
  isEmpty: boolean;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function stateFromThreshold(status: ReturnType<typeof compareToThreshold>["status"]): KpiSemanticState {
  switch (status) {
    case "meeting":
      return "positive";
    case "breaching":
      return "negative";
    default:
      return "neutral";
  }
}

function makeDelta(
  current: number | null | undefined,
  previous: number | null | undefined,
  decimals: number,
  comparisonLabel: string,
): KpiDelta | undefined {
  if (!isNumber(current) || !isNumber(previous)) {
    return undefined;
  }
  const diff = current - previous;
  const direction: KpiTrendDirection =
    Math.abs(diff) < FLAT_EPSILON ? "flat" : diff > 0 ? "up" : "down";
  return { value: Number(diff.toFixed(decimals)), direction, comparisonLabel };
}

/** Build the KPI cards for a summary. Pure; the hook memoises it. */
export function computeKpiCards(
  summary: SlaKpiSummary | null | undefined,
  options: UseKpiCardsOptions = {},
): KpiCardModel[] {
  if (!summary) {
    return [];
  }
  const previous = options.previous ?? null;
  const comparisonLabel = options.comparisonLabel ?? DEFAULT_COMPARISON_LABEL;
  const target = options.complianceTarget ?? DEFAULT_COMPLIANCE_TARGET;

  const compliance = isNumber(summary.complianceRate) ? summary.complianceRate : null;
  const mttr = isNumber(summary.mttrMinutes) ? summary.mttrMinutes : null;
  const violations = isNumber(summary.violationCount) ? summary.violationCount : null;
  const netAmount: unknown = summary.netSettlement?.amount;
  const net = isNumber(netAmount) ? netAmount : null;
  const currency = options.currency ?? summary.netSettlement?.currency;

  const complianceCheck = compareToThreshold(compliance, target, "higher-is-better");
  const mttrCheck = compareToThreshold(mttr, summary.mttrThresholdMinutes, "lower-is-better");

  const cards: KpiCardModel[] = [
    {
      id: "compliance-rate",
      label: "SLA compliance",
      variant: "percentage",
      displayValue: formatPercentage(compliance),
      rawValue: compliance ?? 0,
      state: stateFromThreshold(complianceCheck.status),
      helperText: `Target ${formatPercentage(target)}`,
      delta: makeDelta(compliance, previous?.complianceRate, 1, comparisonLabel),
    },
    {
      id: "mttr",
      label: "Mean time to repair",
      variant: "duration",
      displayValue: formatMttr(mttr),
      rawValue: mttr ?? 0,
      state: stateFromThreshold(mttrCheck.status),
      helperText: isNumber(summary.mttrThresholdMinutes)
        ? `Target ≤ ${formatMttr(summary.mttrThresholdMinutes)}`
        : undefined,
      delta: makeDelta(mttr, previous?.mttrMinutes, 1, comparisonLabel),
    },
    {
      id: "violations",
      label: "SLA violations",
      variant: "absolute",
      displayValue: violations === null ? "—" : String(Math.round(violations)),
      rawValue: violations ?? 0,
      state: violations === null ? "neutral" : violations > 0 ? "negative" : "positive",
      delta: makeDelta(violations, previous?.violationCount, 0, comparisonLabel),
    },
    {
      id: "net-settlement",
      label: "Net settlement",
      variant: "absolute",
      displayValue: formatNetSettlement(net, { currency }),
      rawValue: net ?? 0,
      state: net === null || net === 0 ? "neutral" : net > 0 ? "positive" : "negative",
      delta: makeDelta(net, previous?.netSettlement?.amount, 2, comparisonLabel),
    },
  ];

  return cards.map((card) => stripUndefined(card));
}

/** Drop `undefined` optional properties so cards compare cleanly and serialise tidily. */
function stripUndefined(card: KpiCardModel): KpiCardModel {
  const { helperText, delta, unit, ...rest } = card;
  return {
    ...rest,
    ...(helperText !== undefined ? { helperText } : {}),
    ...(delta !== undefined ? { delta } : {}),
    ...(unit !== undefined ? { unit } : {}),
  };
}

export function useKpiCards(
  summary: SlaKpiSummary | null | undefined,
  options: UseKpiCardsOptions = {},
): UseKpiCardsResult {
  const { complianceTarget, currency, previous, comparisonLabel } = options;
  return useMemo(
    () => ({
      cards: computeKpiCards(summary, { complianceTarget, currency, previous, comparisonLabel }),
      isEmpty: !summary,
    }),
    [summary, complianceTarget, currency, previous, comparisonLabel],
  );
}
