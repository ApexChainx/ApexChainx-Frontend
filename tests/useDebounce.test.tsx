/** ApexChain Network Operations Intelligence Platform */
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { useDebounce } from "@/hooks/useDebounce";

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("initial", 300));
    expect(result.current).toBe("initial");
  });

  it("debounces value changes", async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: "initial" } },
    );

    expect(result.current).toBe("initial");

    rerender({ value: "first" });
    expect(result.current).toBe("initial");

    rerender({ value: "second" });
    expect(result.current).toBe("initial");

    // Fast-forward time but not enough for debounce
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(result.current).toBe("initial");

    // Fast-forward past debounce delay
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBe("second");
  });

  it("only calls the settlement once after multiple rapid changes", async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: "a" } },
    );

    // Simulate rapid typing: a -> ab -> abc -> abcd
    rerender({ value: "ab" });
    rerender({ value: "abc" });
    rerender({ value: "abcd" });

    // Advance past debounce
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    // Should only have the final value
    expect(result.current).toBe("abcd");
  });

  it("handles different delay values", async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "test", delay: 500 } },
    );

    rerender({ value: "changed", delay: 500 });

    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(result.current).toBe("test");

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe("changed");
  });
});