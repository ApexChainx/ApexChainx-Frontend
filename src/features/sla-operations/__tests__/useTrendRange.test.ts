/** ApexChain Frontend Test Suite */
/** Issue #968 — trend range presets, custom ranges and labels. */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  TREND_RANGE_PRESETS,
  useTrendRange,
} from "@/features/sla-operations/hooks/useTrendRange";

const NOW = new Date("2026-05-15T10:00:00Z");
const now = () => NOW;

describe("useTrendRange (#968)", () => {
  it("defaults to the last 30 days", () => {
    const { result } = renderHook(() => useTrendRange({ now }));
    expect(result.current.selection).toBe("last-30-days");
    expect(result.current.range).toEqual({ from: "2026-04-16", to: "2026-05-15" });
    expect(result.current.label).toBe("Last 30 days");
    expect(result.current.rangeLabel).toBe("2026-04-16 – 2026-05-15");
    expect(result.current.isCustom).toBe(false);
    expect(result.current.isOpenEnded).toBe(false);
    expect(result.current.queryParams).toEqual({ from: "2026-04-16", to: "2026-05-15" });
  });

  it("starts from the requested preset", () => {
    const { result } = renderHook(() => useTrendRange({ initialPreset: "last-7-days", now }));
    expect(result.current.range).toEqual({ from: "2026-05-09", to: "2026-05-15" });
    expect(result.current.label).toBe("Last 7 days");
  });

  it("selects each preset using the injected clock", () => {
    const { result } = renderHook(() => useTrendRange({ now }));

    act(() => result.current.selectPreset("today"));
    expect(result.current.range).toEqual({ from: "2026-05-15", to: "2026-05-15" });
    expect(result.current.label).toBe("Today");
    expect(result.current.rangeLabel).toBe("2026-05-15");

    act(() => result.current.selectPreset("this-month"));
    expect(result.current.range).toEqual({ from: "2026-05-01", to: "2026-05-15" });
    expect(result.current.label).toBe("This month");
  });

  it("all-time has no bounds and no query parameters", () => {
    const { result } = renderHook(() => useTrendRange({ now }));
    act(() => result.current.selectPreset("all"));
    expect(result.current.range).toEqual({ from: null, to: null });
    expect(result.current.label).toBe("All time");
    expect(result.current.rangeLabel).toBe("All time");
    expect(result.current.isOpenEnded).toBe(true);
    expect(result.current.queryParams).toEqual({});
  });

  it("accepts a custom range and labels it with its dates", () => {
    const { result } = renderHook(() => useTrendRange({ now }));
    act(() => result.current.setCustomRange({ from: "2026-03-01", to: "2026-03-31" }));
    expect(result.current.selection).toBe("custom");
    expect(result.current.isCustom).toBe(true);
    expect(result.current.label).toBe("2026-03-01 – 2026-03-31");
    expect(result.current.queryParams).toEqual({ from: "2026-03-01", to: "2026-03-31" });
  });

  it("normalises custom dates and corrects an inverted range", () => {
    const { result } = renderHook(() => useTrendRange({ now }));

    act(() => result.current.setCustomRange({ from: "2026-03-10T15:00:00Z", to: "2026-03-05" }));
    expect(result.current.range).toEqual({ from: "2026-03-10", to: "2026-03-10" });
  });

  it("supports open-ended custom ranges", () => {
    const { result } = renderHook(() => useTrendRange({ now }));
    act(() => result.current.setCustomRange({ from: "2026-03-01" }));
    expect(result.current.isOpenEnded).toBe(true);
    expect(result.current.label).toBe("From 2026-03-01");
    expect(result.current.queryParams).toEqual({ from: "2026-03-01" });
  });

  it("falls back to all-time when the custom range has no usable dates", () => {
    const { result } = renderHook(() => useTrendRange({ now }));
    act(() => result.current.setCustomRange({ from: "nope", to: null }));
    expect(result.current.selection).toBe("all");
    expect(result.current.range).toEqual({ from: null, to: null });
  });

  it("reset returns to the initial preset", () => {
    const { result } = renderHook(() => useTrendRange({ initialPreset: "last-7-days", now }));
    act(() => result.current.setCustomRange({ from: "2026-01-01", to: "2026-01-02" }));
    act(() => result.current.reset());
    expect(result.current.selection).toBe("last-7-days");
    expect(result.current.range).toEqual({ from: "2026-05-09", to: "2026-05-15" });
  });

  it("does not move the range when it re-renders", () => {
    let current = new Date("2026-05-15T10:00:00Z");
    const clock = () => current;
    const { result, rerender } = renderHook(() => useTrendRange({ now: clock }));
    const first = result.current.range;

    current = new Date("2026-05-20T10:00:00Z");
    rerender();
    expect(result.current.range).toEqual(first);

    act(() => result.current.selectPreset("today"));
    expect(result.current.range).toEqual({ from: "2026-05-20", to: "2026-05-20" });
  });

  it("exposes the preset options", () => {
    const { result } = renderHook(() => useTrendRange({ now }));
    expect(result.current.presets).toBe(TREND_RANGE_PRESETS);
    expect(result.current.presets.map((preset) => preset.id)).toEqual([
      "today",
      "last-7-days",
      "last-30-days",
      "this-month",
      "all",
    ]);
  });
});
