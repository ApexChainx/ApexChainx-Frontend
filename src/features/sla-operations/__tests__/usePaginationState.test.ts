/** ApexChain Frontend Test Suite */
/** Issue #973 — pagination state with safe bounds. */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { usePaginationState } from "@/features/sla-operations/hooks/usePaginationState";

describe("usePaginationState (#973)", () => {
  it("starts on the first page with the requested page size", () => {
    const { result } = renderHook(() => usePaginationState({ total: 95, initialPageSize: 10 }));
    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(10);
    expect(result.current.totalPages).toBe(10);
    expect(result.current.meta.firstItem).toBe(1);
    expect(result.current.meta.lastItem).toBe(10);
    expect(result.current.meta.hasPrevious).toBe(false);
    expect(result.current.meta.hasNext).toBe(true);
  });

  it("uses the default page size for missing or invalid sizes", () => {
    expect(renderHook(() => usePaginationState({ total: 100 })).result.current.pageSize).toBe(20);
    expect(
      renderHook(() => usePaginationState({ total: 100, initialPageSize: -3 })).result.current
        .pageSize,
    ).toBe(20);
  });

  it("moves between pages and stops at the bounds", () => {
    const { result } = renderHook(() => usePaginationState({ total: 25, initialPageSize: 10 }));

    act(() => result.current.nextPage());
    expect(result.current.page).toBe(2);
    act(() => result.current.nextPage());
    expect(result.current.page).toBe(3);
    act(() => result.current.nextPage());
    expect(result.current.page).toBe(3);
    expect(result.current.meta.lastItem).toBe(25);
    expect(result.current.meta.hasNext).toBe(false);

    act(() => result.current.previousPage());
    expect(result.current.page).toBe(2);
    act(() => result.current.firstPage());
    expect(result.current.page).toBe(1);
    act(() => result.current.previousPage());
    expect(result.current.page).toBe(1);
    act(() => result.current.lastPage());
    expect(result.current.page).toBe(3);
  });

  it("clamps setPage to the valid range and ignores invalid values", () => {
    const { result } = renderHook(() => usePaginationState({ total: 25, initialPageSize: 10 }));

    act(() => result.current.setPage(99));
    expect(result.current.page).toBe(3);
    act(() => result.current.setPage(0));
    expect(result.current.page).toBe(1);
    act(() => result.current.setPage(Number.NaN));
    expect(result.current.page).toBe(1);
    act(() => result.current.setPage(2.9));
    expect(result.current.page).toBe(2);
  });

  it("pulls the page back when the dataset shrinks", () => {
    const { result, rerender } = renderHook(
      ({ total }) => usePaginationState({ total, initialPageSize: 10, initialPage: 5 }),
      { initialProps: { total: 100 } },
    );
    expect(result.current.page).toBe(5);

    rerender({ total: 12 });
    expect(result.current.page).toBe(2);
    expect(result.current.totalPages).toBe(2);

    rerender({ total: 0 });
    expect(result.current.page).toBe(1);
    expect(result.current.totalPages).toBe(0);
    expect(result.current.meta.firstItem).toBe(0);
  });

  it("is safe with an empty or invalid total", () => {
    for (const total of [0, -5, Number.NaN]) {
      const { result } = renderHook(() => usePaginationState({ total, initialPageSize: 10 }));
      expect(result.current.page).toBe(1);
      expect(result.current.totalPages).toBe(0);
      expect(result.current.meta.hasNext).toBe(false);
      act(() => result.current.nextPage());
      expect(result.current.page).toBe(1);
    }
  });

  it("keeps the first visible item on screen when the page size changes", () => {
    const { result } = renderHook(() =>
      usePaginationState({ total: 100, initialPageSize: 10, initialPage: 4 }),
    );
    expect(result.current.meta.firstItem).toBe(31);

    act(() => result.current.setPageSize(20));
    expect(result.current.pageSize).toBe(20);
    expect(result.current.page).toBe(2);
    expect(result.current.meta.firstItem).toBe(21);

    act(() => result.current.setPageSize(5));
    expect(result.current.page).toBe(5);
  });

  it("normalises invalid page sizes", () => {
    const { result } = renderHook(() => usePaginationState({ total: 500, initialPageSize: 10 }));
    act(() => result.current.setPageSize(0));
    expect(result.current.pageSize).toBe(20);
    act(() => result.current.setPageSize(1000));
    expect(result.current.pageSize).toBe(100);
  });

  it("slices items for the current page", () => {
    const items = Array.from({ length: 25 }, (_, index) => index + 1);
    const { result } = renderHook(() =>
      usePaginationState({ total: items.length, initialPageSize: 10 }),
    );

    expect(result.current.paginateItems(items)).toEqual(items.slice(0, 10));
    act(() => result.current.lastPage());
    expect(result.current.paginateItems(items)).toEqual([21, 22, 23, 24, 25]);
  });

  it("reset returns to the initial page and size", () => {
    const { result } = renderHook(() =>
      usePaginationState({ total: 100, initialPageSize: 10, initialPage: 2 }),
    );
    act(() => result.current.setPageSize(25));
    act(() => result.current.nextPage());
    act(() => result.current.reset());
    expect(result.current.page).toBe(2);
    expect(result.current.pageSize).toBe(10);
  });
});
