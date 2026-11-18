/** ApexChain Frontend Test Suite */
/** Issue #923 — pagination page counts, bounds and slicing. */
import { describe, expect, it } from "vitest";

import {
  getPaginationMeta,
  getTotalPages,
  normalizePage,
  normalizePageSize,
  paginate,
} from "@/features/sla-operations/utils/pagination";

describe("pagination utilities (#923)", () => {
  it("calculates page counts", () => {
    expect(getTotalPages(0, 20)).toBe(0);
    expect(getTotalPages(100, 20)).toBe(5);
    expect(getTotalPages(101, 20)).toBe(6);
    expect(getTotalPages(10, 0)).toBe(0);
  });

  it("normalises page and page-size inputs", () => {
    expect(normalizePage(0, 5)).toBe(1);
    expect(normalizePage(10, 5)).toBe(5);
    expect(normalizePage(2, 0)).toBe(2);
    expect(normalizePageSize(0)).toBe(20);
    expect(normalizePageSize(500)).toBe(100);
    expect(normalizePageSize(10, 5)).toBe(5);
  });

  it("builds complete page metadata", () => {
    const meta = getPaginationMeta({ page: 2, pageSize: 10, total: 25 });
    expect(meta).toMatchObject({
      page: 2,
      pageSize: 10,
      total: 25,
      totalPages: 3,
      startIndex: 10,
      endIndex: 20,
      firstItem: 11,
      lastItem: 20,
      hasNext: true,
      hasPrevious: true,
    });
  });

  it("slices datasets and handles empty results", () => {
    const items = Array.from({ length: 25 }, (_, index) => index);
    const result = paginate(items, 2, 10);
    expect(result.items).toHaveLength(10);
    expect(result.items[0]).toBe(10);
    expect(result.meta.firstItem).toBe(11);

    const empty = paginate([], 1, 10);
    expect(empty.items).toEqual([]);
    expect(empty.meta.firstItem).toBe(0);
  });
});
