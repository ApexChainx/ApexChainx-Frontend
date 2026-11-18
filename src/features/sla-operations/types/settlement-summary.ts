/** ApexChain Network Operations Intelligence Platform */
/**
 * Settlement summary types (Issue #905).
 *
 * Typed view models for SLA settlement/payment summaries, line items and
 * reconciliation display states. All monetary fields carry an explicit
 * currency and numeric type so formatting utilities can consume them safely.
 */

/** Lifecycle status of an SLA settlement. */
export type SettlementStatus =
  | "pending"
  | "calculating"
  | "ready"
  | "disputed"
  | "settled"
  | "failed";

/** Whether a line item increases or decreases the net settlement. */
export type SettlementLineItemKind = "reward" | "penalty" | "adjustment";

/** A single reward, penalty or adjustment contributing to a settlement. */
export interface SettlementLineItem {
  id: string;
  kind: SettlementLineItemKind;
  /** Related outage, when the line item stems from one. */
  outageId?: string | null;
  /** Related SLA result, when the backend supplies one. */
  slaResultId?: string | null;
  label: string;
  /** Signed amount: positive for rewards, negative for penalties. */
  amount: number;
  /** ISO 4217 currency code. */
  currency: string;
  /** ISO-8601 timestamp the line item was produced. */
  createdAt: string;
}

/** Aggregated settlement for a reporting period. */
export interface SettlementSummary {
  id: string;
  /** Inclusive start of the settlement period (ISO date string). */
  periodStart: string;
  /** Inclusive end of the settlement period (ISO date string). */
  periodEnd: string;
  status: SettlementStatus;
  /** ISO 4217 currency code shared by all amounts in the summary. */
  currency: string;
  /** Sum of all reward line items (positive). */
  rewardTotal: number;
  /** Magnitude of all penalty line items (positive). */
  penaltyTotal: number;
  /** rewardTotal - penaltyTotal. */
  netAmount: number;
  lineItems: SettlementLineItem[];
  /** ISO-8601 timestamp of the last successful reconciliation, if any. */
  reconciledAt?: string | null;
  /** Human-readable note surfaced on reconciliation panels. */
  reconciliationNote?: string | null;
}

/** Presentation state used by settlement summary panels. */
export interface SettlementDisplayState {
  summary: SettlementSummary;
  /** True when the summary predates the latest data refresh. */
  isStale: boolean;
  /** True when one or more line items are under dispute. */
  hasDisputes: boolean;
}
