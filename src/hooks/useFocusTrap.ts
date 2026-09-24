/** ApexChain Network Operations Intelligence Platform */
"use client";

import { RefObject, useEffect } from "react";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Traps focus within `containerRef` while `open` is true.
 * Restores focus to the element that was active when the trap engaged.
 * Closes on Escape via `onClose`.
 *
 * `options.initialFocus` (a CSS selector, issue #534) lets the caller land
 * initial focus on a landmark — commonly a dialog heading with
 * `tabIndex={-1}` — instead of always jumping to the first focusable
 * element. When omitted, the first focusable element (or the element that
 * opened the trap) is used.
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  open: boolean,
  onClose: () => void,
  options?: { initialFocus?: string | null },
) {
  useEffect(() => {
    if (!open) return;

    const trigger = document.activeElement as HTMLElement | null;
    const container = containerRef.current;

    // Move focus into the container on open — prefer the caller-selected
    // landmark (e.g. the dialog heading), otherwise the first focusable.
    const initialSelector = options?.initialFocus?.trim();
    const initialTarget = initialSelector
      ? container?.querySelector<HTMLElement>(initialSelector)
      : null;
    const firstFocusable = container?.querySelector<HTMLElement>(FOCUSABLE);
    (initialTarget ?? firstFocusable)?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (!container) return;

      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      trigger?.focus();
    };
  }, [open, containerRef, onClose, options?.initialFocus]);
}
