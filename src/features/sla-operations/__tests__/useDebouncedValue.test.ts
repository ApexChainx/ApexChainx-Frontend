/** ApexChain Frontend Test Suite */
/** Issue #972 — debounced value hook timing and flushing. */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_DEBOUNCE_MS,
  normalizeDebounceDelay,
  useDebouncedValue,
} from "@/features/sla-operations/hooks/useDebouncedValue";

describe("useDebouncedValue (#972)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with the initial value and nothing pending", () => {
    const { result } = renderHook(() => useDebouncedValue("a", 200));
    expect(result.current.debouncedValue).toBe("a");
    expect(result.current.isPending).toBe(false);
  });

  it("updates only after the delay has elapsed", () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 200), {
      initialProps: { value: "a" },
    });

    rerender({ value: "b" });
    expect(result.current.debouncedValue).toBe("a");
    expect(result.current.isPending).toBe(true);

    act(() => {
      vi.advanceTimersByTime(199);
    });
    expect(result.current.debouncedValue).toBe("a");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.debouncedValue).toBe("b");
    expect(result.current.isPending).toBe(false);
  });

  it("restarts the timer on every change and settles on the last value", () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 200), {
      initialProps: { value: "a" },
    });

    rerender({ value: "b" });
    act(() => {
      vi.advanceTimersByTime(150);
    });
    rerender({ value: "c" });
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(result.current.debouncedValue).toBe("a");

    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(result.current.debouncedValue).toBe("c");
  });

  it("does not schedule anything when the value returns to the debounced one", () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 200), {
      initialProps: { value: "a" },
    });
    rerender({ value: "b" });
    rerender({ value: "a" });
    expect(result.current.isPending).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("flush applies the latest value immediately and cancels the timer", () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 200), {
      initialProps: { value: "a" },
    });
    rerender({ value: "b" });

    act(() => result.current.flush());
    expect(result.current.debouncedValue).toBe("b");
    expect(result.current.isPending).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("falls back to the default delay for invalid delays", () => {
    expect(normalizeDebounceDelay(undefined)).toBe(DEFAULT_DEBOUNCE_MS);
    expect(normalizeDebounceDelay(Number.NaN)).toBe(DEFAULT_DEBOUNCE_MS);
    expect(normalizeDebounceDelay(-1)).toBe(DEFAULT_DEBOUNCE_MS);
    expect(normalizeDebounceDelay(0)).toBe(0);
    expect(normalizeDebounceDelay(50)).toBe(50);

    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, -5), {
      initialProps: { value: "a" },
    });
    rerender({ value: "b" });
    act(() => {
      vi.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);
    });
    expect(result.current.debouncedValue).toBe("b");
  });

  it("supports a custom equality check for recreated objects", () => {
    const isEqual = (a: { q: string }, b: { q: string }) => a.q === b.q;
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 200, { isEqual }),
      { initialProps: { value: { q: "x" } } },
    );

    rerender({ value: { q: "x" } });
    expect(result.current.isPending).toBe(false);

    rerender({ value: { q: "y" } });
    expect(result.current.isPending).toBe(true);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.debouncedValue).toEqual({ q: "y" });
  });

  it("clears its timer on unmount", () => {
    const { rerender, unmount } = renderHook(({ value }) => useDebouncedValue(value, 200), {
      initialProps: { value: "a" },
    });
    rerender({ value: "b" });
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
