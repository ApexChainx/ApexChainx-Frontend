/** ApexChain Frontend Test Suite */
/** Issue #975 — sort field/direction state and header toggling. */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  toggleSortState,
  useSortState,
} from "@/features/sla-operations/hooks/useSortState";

type Field = "site" | "mttr" | "detected";

describe("toggleSortState (#975)", () => {
  it("selects a new field in the default direction", () => {
    expect(toggleSortState<Field>({ field: null, direction: "asc" }, "site")).toEqual({
      field: "site",
      direction: "asc",
    });
    expect(
      toggleSortState<Field>({ field: "site", direction: "desc" }, "mttr", {
        defaultDirection: "desc",
      }),
    ).toEqual({ field: "mttr", direction: "desc" });
  });

  it("flips the direction when the same field is toggled", () => {
    expect(toggleSortState<Field>({ field: "site", direction: "asc" }, "site")).toEqual({
      field: "site",
      direction: "desc",
    });
  });

  it("returns to the default direction, or clears with allowClear", () => {
    const flipped = { field: "site", direction: "desc" } as const;
    expect(toggleSortState<Field>(flipped, "site")).toEqual({ field: "site", direction: "asc" });
    expect(toggleSortState<Field>(flipped, "site", { allowClear: true })).toEqual({
      field: null,
      direction: "asc",
    });
  });
});

describe("useSortState (#975)", () => {
  it("starts unsorted by default", () => {
    const { result } = renderHook(() => useSortState<Field>());
    expect(result.current.sort).toEqual({ field: null, direction: "asc" });
    expect(result.current.field).toBeNull();
    expect(result.current.getAriaSort("site")).toBe("none");
  });

  it("uses the initial field and direction", () => {
    const { result } = renderHook(() =>
      useSortState<Field>({ initialField: "detected", initialDirection: "desc" }),
    );
    expect(result.current.field).toBe("detected");
    expect(result.current.direction).toBe("desc");
    expect(result.current.isSortedBy("detected")).toBe(true);
    expect(result.current.isSortedBy("site")).toBe(false);
    expect(result.current.getAriaSort("detected")).toBe("descending");
  });

  it("falls back to the default direction for the initial direction", () => {
    const { result } = renderHook(() =>
      useSortState<Field>({ initialField: "site", defaultDirection: "desc" }),
    );
    expect(result.current.direction).toBe("desc");
  });

  it("toggles through select, flip and back", () => {
    const { result } = renderHook(() => useSortState<Field>());

    act(() => result.current.toggleSort("site"));
    expect(result.current.sort).toEqual({ field: "site", direction: "asc" });
    expect(result.current.getAriaSort("site")).toBe("ascending");

    act(() => result.current.toggleSort("site"));
    expect(result.current.direction).toBe("desc");

    act(() => result.current.toggleSort("site"));
    expect(result.current.sort).toEqual({ field: "site", direction: "asc" });
  });

  it("clears on the third toggle when allowClear is set", () => {
    const { result } = renderHook(() => useSortState<Field>({ allowClear: true }));
    act(() => result.current.toggleSort("mttr"));
    act(() => result.current.toggleSort("mttr"));
    act(() => result.current.toggleSort("mttr"));
    expect(result.current.field).toBeNull();
    expect(result.current.getAriaSort("mttr")).toBe("none");
  });

  it("resets direction to the default when switching fields", () => {
    const { result } = renderHook(() => useSortState<Field>());
    act(() => result.current.toggleSort("site"));
    act(() => result.current.toggleSort("site"));
    act(() => result.current.toggleSort("mttr"));
    expect(result.current.sort).toEqual({ field: "mttr", direction: "asc" });
  });

  it("setSort chooses field and direction explicitly", () => {
    const { result } = renderHook(() => useSortState<Field>({ defaultDirection: "desc" }));
    act(() => result.current.setSort("site", "asc"));
    expect(result.current.sort).toEqual({ field: "site", direction: "asc" });
    act(() => result.current.setSort("mttr"));
    expect(result.current.sort).toEqual({ field: "mttr", direction: "desc" });
    act(() => result.current.setSort(null));
    expect(result.current.field).toBeNull();
  });

  it("resetSort restores the initial sort and clearSort removes it", () => {
    const { result } = renderHook(() =>
      useSortState<Field>({ initialField: "detected", initialDirection: "desc" }),
    );
    act(() => result.current.toggleSort("site"));
    act(() => result.current.resetSort());
    expect(result.current.sort).toEqual({ field: "detected", direction: "desc" });

    act(() => result.current.clearSort());
    expect(result.current.field).toBeNull();
  });

  it("keeps callbacks stable across state changes", () => {
    const { result } = renderHook(() => useSortState<Field>());
    const { toggleSort, setSort, resetSort, clearSort } = result.current;
    act(() => result.current.toggleSort("site"));
    expect(result.current.toggleSort).toBe(toggleSort);
    expect(result.current.setSort).toBe(setSort);
    expect(result.current.resetSort).toBe(resetSort);
    expect(result.current.clearSort).toBe(clearSort);
  });
});
