/** ApexChain Network Operations Intelligence Platform */
/**
 * SLA rating helpers (Issue #928).
 *
 * Convert a compliance score (0-100) into a stable rating band and display
 * values. Nullish or non-finite input maps to the `unrated` band.
 */

/** Rating band derived from a compliance score. */
export type SlaRating = "excellent" | "good" | "fair" | "poor" | "unrated";

/** Display details for one rating. */
export interface SlaRatingPresentation {
  rating: SlaRating;
  label: string;
  tone: "positive" | "caution" | "negative" | "neutral";
}

/** Minimum score (inclusive) for each band, highest first. */
const BANDS: ReadonlyArray<{ min: number; rating: SlaRating }> = [
  { min: 99, rating: "excellent" },
  { min: 95, rating: "good" },
  { min: 90, rating: "fair" },
  { min: 0, rating: "poor" },
];

const PRESENTATIONS: Record<SlaRating, Omit<SlaRatingPresentation, "rating">> = {
  excellent: { label: "Excellent", tone: "positive" },
  good: { label: "Good", tone: "positive" },
  fair: { label: "Fair", tone: "caution" },
  poor: { label: "Poor", tone: "negative" },
  unrated: { label: "Unrated", tone: "neutral" },
};

/** Map a score to a rating. Scores are clamped to 0-100; invalid input is `unrated`. */
export function getSlaRating(score: number | null | undefined): SlaRating {
  if (typeof score !== "number" || !Number.isFinite(score)) {
    return "unrated";
  }
  const clamped = Math.min(100, Math.max(0, score));
  return BANDS.find((band) => clamped >= band.min)?.rating ?? "unrated";
}

/** Return label and tone for a score. */
export function getSlaRatingPresentation(
  score: number | null | undefined,
): SlaRatingPresentation {
  const rating = getSlaRating(score);
  return { rating, ...PRESENTATIONS[rating] };
}

/** Whether the score is at or above the given target (invalid input is never passing). */
export function isPassingScore(
  score: number | null | undefined,
  target: number,
): boolean {
  return typeof score === "number" && Number.isFinite(score) && score >= target;
}
