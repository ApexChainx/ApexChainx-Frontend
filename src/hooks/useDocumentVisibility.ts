/** ApexChain Network Operations Intelligence Platform */
"use client";

import { useEffect, useState } from "react";

/**
 * Issue #570 — track whether the document is currently visible.
 *
 * Polling loops (the outage detail 15s poll, the health heartbeat) were
 * running unconditionally, so a tab left in the background kept burning
 * battery and request budget on devices where the OS throttles nothing.
 * Consuming this hook lets a poll suspend itself while the document is
 * hidden and resume on the `visibilitychange` event.
 *
 * Returns `true` during SSR and before hydration resolves, so a render that
 * happens before the first effect runs still starts the poll — the
 * suspension is applied on the very next effect pass rather than silently
 * never polling at all.
 */
export function useDocumentVisibility(): boolean {
  const [isVisible, setIsVisible] = useState<boolean>(() => {
    if (typeof document === "undefined") return true;
    return !document.hidden;
  });

  useEffect(() => {
    function syncVisibility() {
      setIsVisible(!document.hidden);
    }

    // The document may have been hidden between render and effect, so read
    // the live value once instead of trusting the initial state.
    syncVisibility();

    document.addEventListener("visibilitychange", syncVisibility);
    return () => {
      document.removeEventListener("visibilitychange", syncVisibility);
    };
  }, []);

  return isVisible;
}

export default useDocumentVisibility;
