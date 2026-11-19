/** ApexChain Network Operations Intelligence Platform */
/**
 * Duration bucket utilities (Issue #959).
 *
 * Pure helpers for grouping durations (MTTR, time-to-acknowledge, outage
 * length) into contiguous buckets for charts and summaries. Buckets are built
 * from ascending boundaries, so they never overlap or leave gaps: each bucket
 * includes its lower bound and excludes its upper bound, and the last bucket
 * is open ended. Inputs may be minutes as numbers, numeric strings or compact
 * strings such as "1h 30m" (anything `normalizeMttrMinutes` accepts); values
 * that cannot be resolved are skipped and counted, never thrown on.
 */

import { formatMttr, normalizeMttrMinutes } from "./mttr";

/** One bucket of durations, in minutes. */
export interface DurationBucketDefinition {
  /** Stable identifier derived from the bounds, e.g. "30-60" or "1440+". */
  id: string;
  /** Short label for axes and legends, e.g. "30m–1h". */
  label: string;
  /** Inclusive lower bound, in minutes. */
  minMinutes: number;
  /** Exclusive upper bound, in minutes; `null` for the open-ended last bucket. */
  maxMinutes: number | null;
}

/** A bucket together with how many durations fell into it. */
export interface DurationBucketCount extends DurationBucketDefinition {
  count: number;
  /** Fraction (0..1) of counted durations in this bucket; 0 when none were counted. */
  share: number;
}

/** Result of bucketing a list of durations. */
export interface DurationBucketSummary {
  buckets: DurationBucketCount[];
  /** Durations that landed in a bucket. */
  counted: number;
  /** Inputs that were nullish, negative or otherwise unusable. */
  skipped: number;
  /** `counted + skipped`. */
  total: number;
}

/** Any duration input accepted by the MTTR helpers. */
export type DurationInput = number | string | null | undefined;

const EN_DASH = "–";

/**
 * Build contiguous buckets from boundaries in minutes.
 *
 * Boundaries are sorted, de-duplicated, and anything that is not a finite
 * number greater than zero is dropped. `[30, 60]` yields `<30m`, `30m–1h` and
 * `1h+`. With no usable boundaries a single bucket covering every duration is
 * returned.
 */
export function createDurationBuckets(
  boundaries: ReadonlyArray<number | null | undefined>,
): DurationBucketDefinition[] {
  const edges = [
    ...new Set(
      boundaries.filter(
        (value): value is number =>
          typeof value === "number" && Number.isFinite(value) && value > 0,
      ),
    ),
  ].sort((a, b) => a - b);

  if (edges.length === 0) {
    return [{ id: "0+", label: "All", minMinutes: 0, maxMinutes: null }];
  }

  const buckets: DurationBucketDefinition[] = [];
  let lower = 0;
  for (const upper of edges) {
    buckets.push({
      id: `${lower}-${upper}`,
      label:
        lower === 0
          ? `<${formatMttr(upper)}`
          : `${formatMttr(lower)}${EN_DASH}${formatMttr(upper)}`,
      minMinutes: lower,
      maxMinutes: upper,
    });
    lower = upper;
  }
  buckets.push({
    id: `${lower}+`,
    label: `${formatMttr(lower)}+`,
    minMinutes: lower,
    maxMinutes: null,
  });
  return buckets;
}

/** Default buckets: <30m, 30m–1h, 1h–4h, 4h–12h, 12h–24h and 24h+. */
export const DEFAULT_DURATION_BUCKETS: readonly DurationBucketDefinition[] =
  Object.freeze(createDurationBuckets([30, 60, 240, 720, 1440]));

/**
 * Find the bucket a duration belongs to, or `null` when the duration cannot
 * be resolved to a non-negative number of minutes.
 */
export function assignDurationBucket(
  duration: DurationInput,
  buckets: readonly DurationBucketDefinition[] = DEFAULT_DURATION_BUCKETS,
): DurationBucketDefinition | null {
  const minutes = normalizeMttrMinutes(duration);
  if (minutes === null) {
    return null;
  }
  return (
    buckets.find(
      (bucket) =>
        minutes >= bucket.minMinutes &&
        (bucket.maxMinutes === null || minutes < bucket.maxMinutes),
    ) ?? null
  );
}

/**
 * Count durations per bucket. Every bucket is returned, including empty ones
 * and in bucket order, so charts always render the same axis.
 */
export function bucketDurations(
  durations: readonly DurationInput[],
  buckets: readonly DurationBucketDefinition[] = DEFAULT_DURATION_BUCKETS,
): DurationBucketSummary {
  const counts = new Map<string, number>();
  let counted = 0;
  let skipped = 0;

  for (const duration of durations) {
    const bucket = assignDurationBucket(duration, buckets);
    if (bucket === null) {
      skipped += 1;
      continue;
    }
    counts.set(bucket.id, (counts.get(bucket.id) ?? 0) + 1);
    counted += 1;
  }

  return {
    buckets: buckets.map((bucket) => {
      const count = counts.get(bucket.id) ?? 0;
      return { ...bucket, count, share: counted > 0 ? count / counted : 0 };
    }),
    counted,
    skipped,
    total: counted + skipped,
  };
}

/** The bucket holding the most durations, or `null` when none were counted. Ties go to the shorter bucket. */
export function findModalBucket(
  summary: DurationBucketSummary,
): DurationBucketCount | null {
  let best: DurationBucketCount | null = null;
  for (const bucket of summary.buckets) {
    if (bucket.count > 0 && (best === null || bucket.count > best.count)) {
      best = bucket;
    }
  }
  return best;
}
