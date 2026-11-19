/** ApexChain Frontend Test Suite */
/** Issue #959 — duration bucketing for MTTR and outage-length summaries. */
import { describe, expect, it } from "vitest";

import {
  assignDurationBucket,
  bucketDurations,
  createDurationBuckets,
  DEFAULT_DURATION_BUCKETS,
  findModalBucket,
} from "@/features/sla-operations/utils/duration-buckets";

describe("duration buckets (#959)", () => {
  describe("createDurationBuckets", () => {
    it("builds contiguous buckets with readable labels", () => {
      const buckets = createDurationBuckets([30, 60]);
      expect(buckets.map((bucket) => bucket.label)).toEqual([
        "<30m",
        "30m–1h",
        "1h+",
      ]);
      expect(buckets.map((bucket) => [bucket.minMinutes, bucket.maxMinutes])).toEqual([
        [0, 30],
        [30, 60],
        [60, null],
      ]);
    });

    it("sorts, de-duplicates and drops unusable boundaries", () => {
      const buckets = createDurationBuckets([60, 30, 30, 0, -5, Number.NaN, null, undefined]);
      expect(buckets.map((bucket) => bucket.id)).toEqual(["0-30", "30-60", "60+"]);
    });

    it("returns one catch-all bucket when there are no usable boundaries", () => {
      expect(createDurationBuckets([])).toEqual([
        { id: "0+", label: "All", minMinutes: 0, maxMinutes: null },
      ]);
      expect(createDurationBuckets([0, -1])).toHaveLength(1);
    });
  });

  describe("assignDurationBucket", () => {
    it("includes the lower bound and excludes the upper bound", () => {
      expect(assignDurationBucket(0)?.id).toBe("0-30");
      expect(assignDurationBucket(29.9)?.id).toBe("0-30");
      expect(assignDurationBucket(30)?.id).toBe("30-60");
      expect(assignDurationBucket(1440)?.id).toBe("1440+");
      expect(assignDurationBucket(100000)?.id).toBe("1440+");
    });

    it("accepts numeric strings and compact durations", () => {
      expect(assignDurationBucket("45")?.id).toBe("30-60");
      expect(assignDurationBucket("1h 30m")?.id).toBe("60-240");
    });

    it("returns null for nullish, negative and invalid input", () => {
      expect(assignDurationBucket(null)).toBeNull();
      expect(assignDurationBucket(undefined)).toBeNull();
      expect(assignDurationBucket(-1)).toBeNull();
      expect(assignDurationBucket("soon")).toBeNull();
      expect(assignDurationBucket(Number.NaN)).toBeNull();
    });

    it("works with custom buckets", () => {
      const custom = createDurationBuckets([10]);
      expect(assignDurationBucket(9, custom)?.label).toBe("<10m");
      expect(assignDurationBucket(10, custom)?.label).toBe("10m+");
    });
  });

  describe("bucketDurations", () => {
    it("counts every bucket, in order, including empty ones", () => {
      const summary = bucketDurations([10, 20, 45, "2h", 5000]);
      expect(summary.buckets).toHaveLength(DEFAULT_DURATION_BUCKETS.length);
      expect(summary.buckets.map((bucket) => bucket.count)).toEqual([2, 1, 1, 0, 0, 1]);
      expect(summary.counted).toBe(5);
      expect(summary.skipped).toBe(0);
      expect(summary.total).toBe(5);
    });

    it("reports shares that sum to one", () => {
      const summary = bucketDurations([10, 20, 45, 90]);
      const total = summary.buckets.reduce((acc, bucket) => acc + bucket.share, 0);
      expect(total).toBeCloseTo(1);
      expect(summary.buckets[0]?.share).toBe(0.5);
    });

    it("skips unusable values and counts them", () => {
      const summary = bucketDurations([10, null, undefined, -3, "n/a"]);
      expect(summary.counted).toBe(1);
      expect(summary.skipped).toBe(4);
      expect(summary.total).toBe(5);
    });

    it("handles an empty list with zero shares", () => {
      const summary = bucketDurations([]);
      expect(summary.total).toBe(0);
      expect(summary.buckets.every((bucket) => bucket.count === 0 && bucket.share === 0)).toBe(true);
    });
  });

  describe("findModalBucket", () => {
    it("returns the fullest bucket, preferring the shorter one on a tie", () => {
      expect(findModalBucket(bucketDurations([10, 20, 45]))?.id).toBe("0-30");
      expect(findModalBucket(bucketDurations([10, 45]))?.id).toBe("0-30");
    });

    it("returns null when nothing was counted", () => {
      expect(findModalBucket(bucketDurations([]))).toBeNull();
      expect(findModalBucket(bucketDurations([null, "bad"]))).toBeNull();
    });
  });
});
