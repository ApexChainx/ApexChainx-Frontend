/** ApexChain Network Operations Intelligence Platform */
/**
 * SLA status mapping utilities (Issue #916).
 *
 * Pure helpers that translate the various status strings produced by the
 * backend into stable UI labels and semantic states. Unknown or nullish input
 * is mapped to an explicit `unknown` presentation rather than throwing.
 */

/** Normalised SLA outcome used as a discriminant in the UI. */
export type SlaOutcome = "met" | "violated" | "pending" | "disputed" | "unknown";

/** Semantic state used to choose a colour token. */
export type SlaSemanticState =
  | "success"
  | "danger"
  | "warning"
  | "neutral"
  | "info";

/** Presentation details for one SLA outcome. */
export interface SlaStatusPresentation {
  outcome: SlaOutcome;
  label: string;
  state: SlaSemanticState;
  tone: "positive" | "negative" | "caution" | "neutral";
}

const PRESENTATIONS: Record<SlaOutcome, Omit<SlaStatusPresentation, "outcome">> = {
  met: { label: "Met", state: "success", tone: "positive" },
  violated: { label: "Violated", state: "danger", tone: "negative" },
  pending: { label: "Pending", state: "info", tone: "neutral" },
  disputed: { label: "Disputed", state: "warning", tone: "caution" },
  unknown: { label: "Unknown", state: "neutral", tone: "neutral" },
};

/** Backend aliases mapped onto the normalised outcome set. */
const ALIASES: Readonly<Record<string, SlaOutcome>> = {
  met: "met",
  ok: "met",
  pass: "met",
  passed: "met",
  compliant: "met",
  achieved: "met",
  violated: "violated",
  breach: "violated",
  breached: "violated",
  failed: "violated",
  fail: "violated",
  miss: "violated",
  missed: "violated",
  noncompliant: "violated",
  pending: "pending",
  in_progress: "pending",
  calculating: "pending",
  scheduled: "pending",
  disputed: "disputed",
  under_review: "disputed",
  contested: "disputed",
  unknown: "unknown",
};

/** Normalise a raw status value to a known SLA outcome. */
export function normalizeSlaOutcome(
  value: string | null | undefined,
): SlaOutcome {
  if (typeof value !== "string") {
    return "unknown";
  }
  const key = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return ALIASES[key] ?? "unknown";
}

/** Return the full presentation model for a raw SLA status value. */
export function getSlaStatusPresentation(
  value: string | null | undefined,
): SlaStatusPresentation {
  const outcome = normalizeSlaOutcome(value);
  return { outcome, ...PRESENTATIONS[outcome] };
}

/** Return the human-readable label for a raw SLA status value. */
export function getSlaStatusLabel(value: string | null | undefined): string {
  return getSlaStatusPresentation(value).label;
}

/** Whether the raw status represents a violation. */
export function isSlaViolation(value: string | null | undefined): boolean {
  return normalizeSlaOutcome(value) === "violated";
}

/** Whether the raw status represents a met SLA. */
export function isSlaMet(value: string | null | undefined): boolean {
  return normalizeSlaOutcome(value) === "met";
}
