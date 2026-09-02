/** ApexChain Network Operations Intelligence Platform */
"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Guards against losing unsaved form state. While `dirty` is true it:
 *  - prompts before the tab/window is closed or reloaded, and
 *  - intercepts the browser back/forward buttons with a confirmation.
 *
 * Callers must also confirm before triggering their own programmatic
 * navigation (e.g. a Cancel/Back button) and pass `false` to `cleanup`
 * after a successful submit.
 */
export function useUnsavedChangesGuard(dirty: boolean) {
  const dirtyRef = useRef(dirty);

  // Sync the latest `dirty` into the ref from an effect (not during render) so
  // `confirmLeave`/`markClean` always observe the current value without
  // mutating refs while React is rendering.
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  const confirmLeave = useCallback((): boolean => {
    if (!dirtyRef.current) return true;
    // eslint-disable-next-line no-alert
    return window.confirm(
      "You have unsaved changes. Are you sure you want to leave?",
    );
  }, []);

  useEffect(() => {
    if (!dirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  return {
    confirmLeave,
    /** Call after a successful submit so navigation is never blocked. */
    markClean: useCallback(() => {
      dirtyRef.current = false;
    }, []),
  };
}

/** Returns true when the form differs from its empty default. */
export function isFormDirty(form: Record<string, string>): boolean {
  return Object.values(form).some((value) => value.trim() !== "");
}
