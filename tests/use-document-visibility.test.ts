/** ApexChain Network Operations Intelligence Platform */
/**
 * Issue #570 — backgrounded tabs must not keep polling.
 *
 * The outage detail poll (and the health heartbeat) are driven by this hook:
 * while the document is hidden the loop is torn down entirely, and it is
 * rebuilt on `visibilitychange`. These tests drive real visibilitychange
 * events and assert no interval callback runs in the hidden state.
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useDocumentVisibility } from "@/hooks/useDocumentVisibility";

/** jsdom's `document.hidden` is a getter; override it per test. */
function setDocumentHidden(hidden: boolean) {
  Object.defineProperty(document, "hidden", {
    configurable: true,
    get: () => hidden,
  });
}

function fireVisibilityChange() {
  document.dispatchEvent(new Event("visibilitychange"));
}

describe("useDocumentVisibility", () => {
  beforeEach(() => {
    setDocumentHidden(false);
  });

  afterEach(() => {
    setDocumentHidden(false);
  });

  it("reports visible for a foreground document", () => {
    const { result } = renderHook(() => useDocumentVisibility());
    expect(result.current).toBe(true);
  });

  it("flips to hidden when the document is backgrounded", () => {
    const { result } = renderHook(() => useDocumentVisibility());

    act(() => {
      setDocumentHidden(true);
      fireVisibilityChange();
    });

    expect(result.current).toBe(false);
  });

  it("flips back to visible when the document returns to the foreground", () => {
    const { result } = renderHook(() => useDocumentVisibility());

    act(() => {
      setDocumentHidden(true);
      fireVisibilityChange();
    });
    expect(result.current).toBe(false);

    act(() => {
      setDocumentHidden(false);
      fireVisibilityChange();
    });

    expect(result.current).toBe(true);
  });

  it("gates a poll loop: no interval callback fires while hidden", () => {
    vi.useFakeTimers();
    try {
      let polls = 0;
      const { result, rerender } = renderHook(() => {
        const isVisible = useDocumentVisibility();
        // Mirrors the detail page's poll effect.
        if (isVisible) {
          const id = setInterval(() => {
            polls += 1;
          }, 15_000);
          return () => clearInterval(id);
        }
        return undefined;
      });

      act(() => {
        vi.advanceTimersByTime(45_000);
      });
      expect(polls).toBe(3);

      // Background the tab: the effect cleanup must clear the interval.
      act(() => {
        setDocumentHidden(true);
        fireVisibilityChange();
      });

      act(() => {
        vi.advanceTimersByTime(120_000);
      });
      // No catch-up burst on return either.
      expect(polls).toBe(3);

      act(() => {
        setDocumentHidden(false);
        fireVisibilityChange();
      });

      act(() => {
        vi.advanceTimersByTime(15_000);
      });
      expect(polls).toBe(4);

      rerender();
    } finally {
      vi.useRealTimers();
    }
  });

  it("stops listening after unmount", () => {
    const removeSpy = vi.spyOn(document, "removeEventListener");
    const { unmount } = renderHook(() => useDocumentVisibility());
    unmount();
    expect(removeSpy).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function),
    );
    removeSpy.mockRestore();
  });
});
