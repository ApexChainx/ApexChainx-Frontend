/** ApexChain Network Operations Intelligence Platform */
"use client";

import { useEffect, useRef } from "react";

import { useDocumentVisibility } from "@/hooks/useDocumentVisibility";

interface IntervalWhenVisibleOptions {
  /**
   * Fire once immediately whenever the loop (re)starts, so returning to a
   * foregrounded tab reconciles against the backend straight away instead of
   * waiting a full interval. Defaults to `true`.
   */
  runImmediately?: boolean;
  /** Suspend the loop entirely without unmounting its consumer. */
  enabled?: boolean;
}

/**
 * Issue #604 — the shared scheduling helper for background-aware pollers.
 *
 * `setInterval` alone keeps firing in a hidden tab, so open-but-backgrounded
 * tabs burn request budget on a status nobody is looking at. This hook ties
 * the loop to `useDocumentVisibility`: while the document is hidden the
 * interval is torn down entirely (no catch-up burst on return either), and it
 * is rebuilt — with an immediate tick — the moment the tab becomes visible
 * again.
 *
 * Both `useHealth` and `useStellarHealth` schedule through this so the rule
 * only has to be right in one place.
 */
export function useIntervalWhenVisible(
  callback: () => void,
  intervalMs: number,
  options: IntervalWhenVisibleOptions = {},
): void {
  const { runImmediately = true, enabled = true } = options;
  const isVisible = useDocumentVisibility();

  // Keep the latest callback without restarting the interval on every render.
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled || !isVisible) return;

    if (runImmediately) {
      callbackRef.current();
    }

    const intervalId = setInterval(() => {
      callbackRef.current();
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [enabled, isVisible, intervalMs, runImmediately]);
}

export default useIntervalWhenVisible;
