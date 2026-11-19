/** ApexChain Network Operations Intelligence Platform */
/**
 * Settlement breakdown hook (Issue #964).
 *
 * Derives reward, penalty, adjustment and net totals from settlement line
 * items for breakdown panels. The calculation is also exported as the pure
 * `computeSettlementBreakdown` so it can be reused outside React.
 *
 * Rules:
 * - rewards add `max(0, amount)`, penalties subtract the magnitude of the
 *   amount whichever sign the backend used, and adjustments are applied with
 *   their sign;
 * - all items must share one currency (`currency` if given, otherwise the
 *   first usable item's). Items in another currency are left out of the
 *   totals and counted in `excludedCount`; summing across currencies would be
 *   meaningless;
 * - items with a non-finite amount are skipped and counted in `invalidCount`.
 */
import { useMemo } from "react";

import type {
  SettlementLineItem,
  SettlementLineItemKind,
} from "../types/settlement-summary";

/** Decimal places kept when summing, to hide floating point noise (0.1 + 0.2). */
const AMOUNT_PRECISION = 7;

export interface SettlementBreakdownGroup {
  kind: SettlementLineItemKind;
  /** Items counted in this group. */
  count: number;
  /** Sum of the group's amounts as applied to the net (penalties are negative). */
  total: number;
  items: SettlementLineItem[];
}

export interface SettlementBreakdown {
  /** Currency of the totals, or `null` when no item was usable. */
  currency: string | null;
  /** Total rewards (>= 0). */
  rewardTotal: number;
  /** Total penalties as a positive magnitude (>= 0). */
  penaltyTotal: number;
  /** Signed total of adjustments. */
  adjustmentTotal: number;
  /** `rewardTotal - penaltyTotal + adjustmentTotal`. */
  netAmount: number;
  /** Groups for reward, penalty and adjustment, always in that order. */
  groups: SettlementBreakdownGroup[];
  /** Items included in the totals. */
  includedCount: number;
  /** Items skipped because their currency differs from `currency`. */
  excludedCount: number;
  /** Items skipped because their amount is not a finite number. */
  invalidCount: number;
  /** Distinct currencies seen among valid items. */
  currencies: string[];
  /** True when no item contributed to the totals. */
  isEmpty: boolean;
  /** True when items in more than one currency were provided. */
  hasMixedCurrencies: boolean;
}

export interface UseSettlementBreakdownOptions {
  /** Currency to total in. Defaults to the first usable item's currency. */
  currency?: string | undefined;
}

const KIND_ORDER: readonly SettlementLineItemKind[] = ["reward", "penalty", "adjustment"];

function round(value: number): number {
  return Number(value.toFixed(AMOUNT_PRECISION));
}

function contribution(kind: SettlementLineItemKind, amount: number): number {
  switch (kind) {
    case "reward":
      return Math.max(0, amount);
    case "penalty":
      return -Math.abs(amount);
    default:
      return amount;
  }
}

function normalizeCurrency(currency: string | null | undefined): string | null {
  if (typeof currency !== "string") {
    return null;
  }
  const trimmed = currency.trim().toUpperCase();
  return trimmed === "" ? null : trimmed;
}

/** Compute the breakdown for a list of line items. */
export function computeSettlementBreakdown(
  lineItems: readonly SettlementLineItem[] | null | undefined,
  options: UseSettlementBreakdownOptions = {},
): SettlementBreakdown {
  const items = lineItems ?? [];
  const requested = normalizeCurrency(options.currency);

  const valid = items.filter(
    (item) => typeof item.amount === "number" && Number.isFinite(item.amount),
  );
  const invalidCount = items.length - valid.length;

  const seen: string[] = [];
  for (const item of valid) {
    const code = normalizeCurrency(item.currency);
    if (code !== null && !seen.includes(code)) {
      seen.push(code);
    }
  }
  const currency = requested ?? seen[0] ?? null;

  const groups: SettlementBreakdownGroup[] = KIND_ORDER.map((kind) => ({
    kind,
    count: 0,
    total: 0,
    items: [],
  }));

  let excludedCount = 0;
  for (const item of valid) {
    if (normalizeCurrency(item.currency) !== currency) {
      excludedCount += 1;
      continue;
    }
    const group = groups.find((candidate) => candidate.kind === item.kind);
    if (!group) {
      excludedCount += 1;
      continue;
    }
    group.count += 1;
    group.total += contribution(item.kind, item.amount);
    group.items.push(item);
  }

  for (const group of groups) {
    group.total = round(group.total);
  }

  const total = (kind: SettlementLineItemKind) =>
    groups.find((group) => group.kind === kind)?.total ?? 0;
  const rewardTotal = total("reward");
  const penaltyTotal = round(Math.abs(total("penalty")));
  const adjustmentTotal = total("adjustment");
  const includedCount = groups.reduce((sum, group) => sum + group.count, 0);

  return {
    currency,
    rewardTotal,
    penaltyTotal,
    adjustmentTotal,
    netAmount: round(rewardTotal - penaltyTotal + adjustmentTotal),
    groups,
    includedCount,
    excludedCount,
    invalidCount,
    currencies: seen,
    isEmpty: includedCount === 0,
    hasMixedCurrencies: seen.length > 1,
  };
}

/**
 * Memoised settlement breakdown. Pass a stable `lineItems` array (for example
 * from a query result) so the derivation only reruns when the data changes.
 */
export function useSettlementBreakdown(
  lineItems: readonly SettlementLineItem[] | null | undefined,
  options: UseSettlementBreakdownOptions = {},
): SettlementBreakdown {
  const { currency } = options;
  return useMemo(
    () => computeSettlementBreakdown(lineItems, { currency }),
    [lineItems, currency],
  );
}
