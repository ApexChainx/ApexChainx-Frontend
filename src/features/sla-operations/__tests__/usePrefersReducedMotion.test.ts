/** ApexChain Frontend Test Suite */
/** Issue #1010 — reduced-motion preference hook. */
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  REDUCED_MOTION_QUERY,
  usePrefersReducedMotion,
} from "@/features/sla-operations/hooks/usePrefersReducedMotion";

type ChangeListener = (event: MediaQueryListEvent) => void;

function installMatchMedia(initialMatches: boolean) {
  const listeners = new Set<ChangeListener>();

  const mediaQuery = {
    matches: initialMatches,
    media: REDUCED_MOTION_QUERY,
    onchange: null,
    addEventListener: (_type: string, listener: ChangeListener) => listeners.add(listener),
    removeEventListener: (_type: string, listener: ChangeListener) => listeners.delete(listener),
    addListener: (listener: ChangeListener) => listeners.add(listener),
    removeListener: (listener: ChangeListener) => listeners.delete(listener),
    dispatchEvent: () => true,
  };

  const matchMedia = vi.fn().mockReturnValue(mediaQuery);
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: matchMedia,
  });

  return {
    matchMedia,
    emit(matches: boolean) {
      mediaQuery.matches = matches;
      act(() => {
        listeners.forEach((listener) => listener({ matches } as MediaQueryListEvent));
      });
    },
    listenerCount: () => listeners.size,
  };
}

describe("usePrefersReducedMotion (#1010)", () => {
  afterEach(() => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: undefined,
    });
    vi.restoreAllMocks();
  });

  it("returns false when the media query does not match", () => {
    installMatchMedia(false);
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
  });

  it("reflects the current media query state on mount", () => {
    const mql = installMatchMedia(true);
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(true);
    expect(mql.matchMedia).toHaveBeenCalledWith(REDUCED_MOTION_QUERY);
  });

  it("updates when the preference changes and unsubscribes on unmount", () => {
    const mql = installMatchMedia(false);
    const { result, unmount } = renderHook(() => usePrefersReducedMotion());

    expect(result.current).toBe(false);
    mql.emit(true);
    expect(result.current).toBe(true);
    mql.emit(false);
    expect(result.current).toBe(false);

    expect(mql.listenerCount()).toBe(1);
    unmount();
    expect(mql.listenerCount()).toBe(0);
  });

  it("degrades gracefully when matchMedia is unavailable", () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: undefined,
    });

    expect(() => renderHook(() => usePrefersReducedMotion())).not.toThrow();
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
  });
});
