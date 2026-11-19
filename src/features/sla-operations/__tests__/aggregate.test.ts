/** ApexChain Frontend Test Suite */
/** Issue #960 — counts, totals, averages and grouped summaries. */
import { describe, expect, it } from "vitest";

import {
  average,
  countBy,
  groupBy,
  maxOf,
  median,
  minOf,
  sum,
  summarizeBy,
  topGroups,
  UNKNOWN_GROUP_KEY,
} from "@/features/sla-operations/utils/aggregate";

interface Row {
  severity: string | null | undefined;
  minutes: number | null | undefined;
}

const rows: Row[] = [
  { severity: "high", minutes: 60 },
  { severity: "low", minutes: 10 },
  { severity: "high", minutes: 30 },
  { severity: null, minutes: 5 },
  { severity: "low", minutes: undefined },
];

describe("aggregation utilities (#960)", () => {
  describe("numeric helpers", () => {
    it("sums, averages and finds extremes of usable values", () => {
      const values = [10, 20, null, undefined, Number.NaN, Number.POSITIVE_INFINITY, 30];
      expect(sum(values)).toBe(60);
      expect(average(values)).toBe(20);
      expect(minOf(values)).toBe(10);
      expect(maxOf(values)).toBe(30);
    });

    it("returns 0 for an empty sum and null for the other aggregates", () => {
      expect(sum([])).toBe(0);
      expect(average([])).toBeNull();
      expect(minOf([null, undefined])).toBeNull();
      expect(maxOf([])).toBeNull();
      expect(median([])).toBeNull();
    });

    it("computes the median for odd and even counts without mutating input", () => {
      const values = [5, 1, 3];
      expect(median(values)).toBe(3);
      expect(values).toEqual([5, 1, 3]);
      expect(median([1, 2, 3, 4])).toBe(2.5);
      expect(median([7])).toBe(7);
    });

    it("supports negative values", () => {
      expect(sum([-5, 5, -10])).toBe(-10);
      expect(minOf([-5, 5])).toBe(-5);
    });
  });

  describe("groupBy", () => {
    it("groups in first-seen order and maps missing keys to the unknown group", () => {
      const groups = groupBy(rows, (row) => row.severity);
      expect(groups.map((group) => group.key)).toEqual(["high", "low", UNKNOWN_GROUP_KEY]);
      expect(groups[0]?.items).toHaveLength(2);
    });

    it("treats blank keys as unknown and trims whitespace", () => {
      const groups = groupBy(["a", " a ", "", "  "], (value) => value);
      expect(groups.map((group) => [group.key, group.items.length])).toEqual([
        ["a", 2],
        [UNKNOWN_GROUP_KEY, 2],
      ]);
    });

    it("returns an empty list for no items and is safe with prototype-like keys", () => {
      expect(groupBy([], () => "x")).toEqual([]);
      const groups = groupBy(["__proto__", "constructor"], (value) => value);
      expect(groups.map((group) => group.key)).toEqual(["__proto__", "constructor"]);
    });
  });

  describe("countBy", () => {
    it("counts items per key", () => {
      expect(countBy(rows, (row) => row.severity)).toEqual([
        { key: "high", count: 2 },
        { key: "low", count: 2 },
        { key: UNKNOWN_GROUP_KEY, count: 1 },
      ]);
    });
  });

  describe("summarizeBy", () => {
    it("summarises a numeric field per group, ignoring unusable values", () => {
      const summaries = summarizeBy(
        rows,
        (row) => row.severity,
        (row) => row.minutes,
      );
      expect(summaries).toEqual([
        { key: "high", count: 2, valueCount: 2, sum: 90, average: 45, min: 30, max: 60 },
        { key: "low", count: 2, valueCount: 1, sum: 10, average: 10, min: 10, max: 10 },
        { key: UNKNOWN_GROUP_KEY, count: 1, valueCount: 1, sum: 5, average: 5, min: 5, max: 5 },
      ]);
    });

    it("reports null statistics for a group with no usable values", () => {
      const [summary] = summarizeBy(
        [{ severity: "low", minutes: null }],
        (row) => row.severity,
        (row) => row.minutes,
      );
      expect(summary).toEqual({
        key: "low",
        count: 1,
        valueCount: 0,
        sum: 0,
        average: null,
        min: null,
        max: null,
      });
    });
  });

  describe("topGroups", () => {
    const groups = [
      { key: "a", count: 1 },
      { key: "b", count: 3 },
      { key: "c", count: 3 },
      { key: "d", count: 2 },
    ];

    it("returns the largest groups, keeping first-seen order on ties", () => {
      expect(topGroups(groups, 3).map((group) => group.key)).toEqual(["b", "c", "d"]);
    });

    it("handles limits larger than the list and invalid limits", () => {
      expect(topGroups(groups, 10)).toHaveLength(4);
      expect(topGroups(groups, 0)).toEqual([]);
      expect(topGroups(groups, -1)).toEqual([]);
      expect(topGroups(groups, Number.NaN)).toEqual([]);
    });

    it("does not mutate its input", () => {
      const copy = [...groups];
      topGroups(groups, 2);
      expect(groups).toEqual(copy);
    });
  });
});
