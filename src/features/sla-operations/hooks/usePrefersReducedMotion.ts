/** ApexChain Network Operations Intelligence Platform */
"use client";

import { useSyncExternalStore } from "react";

/**
 * Issue #1010 — reduced-motion preference hook.
 *
 * Tracks the user's `prefers-reduced-motion` setting so SLA operations UI can
 * swap or skip animation instead of forcing motion on users who have asked
 * their operating system to minimise it.
 *
 * Returns `true` when the preference is `reduce`, and `false` otherwise. It is
 * SSR-safe and degrades gracefully: during server rendering, and in
 * environments without `window.matchMedia` (jsdom, older browsers), it
 * returns `false` and never throws. Subscribes to preference changes so a
 * change in OS settings is reflected without a reload, and removes the
 * listener on unmount.
 *
 * Usage:
 * ```tsx
 * const prefersReducedMotion = usePrefersReducedMotion();
 * <div className={prefersReducedMotion ? "opacity-100" : "animate-fade-in"} />
 * ```
 */
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function supportsMatchMedia(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function";
}

function subscribe(onChange: () => void): () => void {
  if (!supportsMatchMedia()) {
    return () => {};
  }

  const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);

  // `addEventListener` is unavailable in older Safari; fall back to the
  // deprecated listener API when needed.
  if (typeof mediaQuery.addEventListener === "function") {
    mediaQuery.addEventListener("change", onChange);
    return () => mediaQuery.removeEventListener("change", onChange);
  }

  mediaQuery.addListener(onChange);
  return () => mediaQuery.removeListener(onChange);
}

function getSnapshot(): boolean {
  return supportsMatchMedia() ? window.matchMedia(REDUCED_MOTION_QUERY).matches : false;
}

function getServerSnapshot(): boolean {
  return false;
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
