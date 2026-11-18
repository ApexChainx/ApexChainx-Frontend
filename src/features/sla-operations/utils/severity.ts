/** ApexChain Network Operations Intelligence Platform */
/**
 * Severity utilities (Issue #919).
 *
 * Pure helpers for severity ordering, labels and comparison in SLA operations
 * views. Unknown values rank below every known level so they can be rendered
 * without throwing and sorted deterministically.
 */

/** Normalised outage/incident severity levels, ordered least to most severe. */
export type Severity = "low" | "medium" | "high" | "critical";

const SEVERITY_RANK: Readonly<Record<Severity, number>> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

const LABELS: Readonly<Record<Severity, string>> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

/** Backend aliases mapped onto the normalised severity set. */
const ALIASES: Readonly<Record<string, Severity>> = {
  low: "low",
  minor: "low",
  info: "low",
  medium: "medium",
  med: "medium",
  moderate: "medium",
  major: "medium",
  high: "high",
  severe: "high",
  critical: "critical",
  crit: "critical",
  urgent: "critical",
};

/** Normalise a raw severity value, or `null` when it is unrecognised. */
export function normalizeSeverity(
  value: string | null | undefined,
): Severity | null {
  if (typeof value !== "string") {
    return null;
  }
  const key = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return ALIASES[key] ?? null;
}

/** Return the human-readable label for a severity, or "Unknown". */
export function getSeverityLabel(value: string | null | undefined): string {
  const severity = normalizeSeverity(value);
  return severity === null ? "Unknown" : LABELS[severity];
}

/** Rank a severity from 0 (low) to 3 (critical); unknown ranks as -1. */
export function severityRank(value: string | null | undefined): number {
  const severity = normalizeSeverity(value);
  return severity === null ? -1 : SEVERITY_RANK[severity];
}

/** Compare two severities in ascending order of severity. */
export function compareSeverity(
  a: string | null | undefined,
  b: string | null | undefined,
): number {
  return severityRank(a) - severityRank(b);
}

/** Whether a severity is at least as severe as the threshold. */
export function isSeverityAtLeast(
  value: string | null | undefined,
  threshold: string | null | undefined,
): boolean {
  const rank = severityRank(value);
  const thresholdRank = severityRank(threshold);
  return rank >= 0 && thresholdRank >= 0 && rank >= thresholdRank;
}

/** Sort items by severity; `desc` (default) places the most severe first. */
export function sortBySeverity<T>(
  items: readonly T[],
  getSeverity: (item: T) => string | null | undefined,
  direction: "asc" | "desc" = "desc",
): T[] {
  const factor = direction === "desc" ? -1 : 1;
  return [...items].sort(
    (a, b) => factor * (severityRank(getSeverity(a)) - severityRank(getSeverity(b))),
  );
}
