/** ApexChain Network Operations Intelligence Platform */
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from "react";

/** Data attribute that marks a navigable item inside the list container. */
export const KEYBOARD_LIST_ITEM_ATTR = "data-keyboard-list-item";
/** Data attribute carrying an item's zero-based position in the list. */
export const KEYBOARD_LIST_INDEX_ATTR = "data-keyboard-list-index";

export type KeyboardListOrientation = "vertical" | "horizontal";

export interface UseKeyboardListNavigationOptions {
  /** Number of navigable items currently rendered. */
  itemCount: number;
  /** Index that receives the initial roving tab stop. Defaults to `0`. */
  initialIndex?: number;
  /** Axis the arrow keys travel along. Defaults to `"vertical"`. */
  orientation?: KeyboardListOrientation;
  /** Wrap past the first/last item instead of clamping. Defaults to `false`. */
  loop?: boolean;
  /** Disables all key handling (items keep their tab stops). */
  disabled?: boolean;
  /** Called on Enter/Space with the index of the item that triggered it. */
  onActivate?: (index: number) => void;
  /** Called on Escape; useful for closing a drawer or popover around the list. */
  onEscape?: () => void;
}

/**
 * Props to spread onto each navigable item. Combine with `role`,
 * `aria-selected` (or `aria-current`) as appropriate for the container.
 */
export interface KeyboardListItemProps {
  "data-keyboard-list-item": "true";
  "data-keyboard-list-index": number;
  tabIndex: number;
  onFocus: () => void;
}

export interface KeyboardListContainerProps<T extends HTMLElement> {
  ref: RefObject<T | null>;
  onKeyDown: (event: ReactKeyboardEvent<T>) => void;
}

export interface UseKeyboardListNavigationResult<T extends HTMLElement> {
  /** Index of the item that currently owns the roving tab stop. */
  activeIndex: number;
  /** Moves the tab stop without moving focus. */
  setActiveIndex: (index: number) => void;
  /** Props for every navigable item, e.g. `<li {...getItemProps(i)}>`. */
  getItemProps: (index: number) => KeyboardListItemProps;
  /** Props for the wrapping element, e.g. `<ul {...containerProps}>`. */
  containerProps: KeyboardListContainerProps<T>;
}

function clampIndex(index: number, itemCount: number) {
  if (itemCount <= 0) return 0;
  return Math.min(Math.max(index, 0), itemCount - 1);
}

/** Text-entry surfaces keep their own key behaviour (typing, caret movement). */
function isTextEntryTarget(target: HTMLElement) {
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/**
 * Roving-tabindex keyboard navigation for lists and tables.
 *
 * Implements the WAI-ARIA "roving tabindex" pattern: exactly one item is in the
 * tab order at a time, and arrow keys / Home / End move both focus and the tab
 * stop. The hook is render-agnostic, so it works for `<ul>`/`<li>`,
 * `<table>`/`<tr>`, or any `div`-based list. The consumer owns semantics
 * (`role="listbox"`, `role="grid"`, `aria-selected`, ...).
 *
 * Usage:
 * ```tsx
 * const nav = useKeyboardListNavigation<HTMLUListElement>({
 *   itemCount: outages.length,
 *   onActivate: (index) => openOutage(outages[index]),
 * });
 *
 * <ul {...nav.containerProps} role="listbox" aria-label="Outages">
 *   {outages.map((outage, index) => (
 *     <li
 *       key={outage.id}
 *       {...nav.getItemProps(index)}
 *       role="option"
 *       aria-selected={index === nav.activeIndex}
 *     >
 *       {outage.site_name}
 *     </li>
 *   ))}
 * </ul>
 * ```
 *
 * Behaviour notes:
 * - Arrow keys along the configured orientation, plus Home/End, move focus.
 * - Enter/Space call `onActivate`; Escape calls `onEscape` when provided.
 * - Key events originating from inputs, textareas, selects, or contenteditable
 *   elements are ignored so in-cell editors keep working.
 * - `activeIndex` is clamped when `itemCount` shrinks.
 * - Safe to use with an empty list; nothing is handled until items exist.
 */
export function useKeyboardListNavigation<T extends HTMLElement = HTMLElement>({
  itemCount,
  initialIndex = 0,
  orientation = "vertical",
  loop = false,
  disabled = false,
  onActivate,
  onEscape,
}: UseKeyboardListNavigationOptions): UseKeyboardListNavigationResult<T> {
  const containerRef = useRef<T | null>(null);

  const [activeIndex, setActiveIndexState] = useState(() =>
    clampIndex(initialIndex, itemCount),
  );

  // Keep the tab stop in range when items are removed.
  useEffect(() => {
    setActiveIndexState((current) => clampIndex(current, itemCount));
  }, [itemCount]);

  const setActiveIndex = useCallback(
    (index: number) => {
      setActiveIndexState(clampIndex(index, itemCount));
    },
    [itemCount],
  );

  const getItemProps = useCallback(
    (index: number): KeyboardListItemProps => ({
      [KEYBOARD_LIST_ITEM_ATTR]: "true",
      [KEYBOARD_LIST_INDEX_ATTR]: index,
      tabIndex: index === activeIndex ? 0 : -1,
      onFocus: () => setActiveIndexState(clampIndex(index, itemCount)),
    }),
    [activeIndex, itemCount],
  );

  const focusItem = useCallback((index: number) => {
    const container = containerRef.current;
    if (!container) return;
    const selector = `[${KEYBOARD_LIST_ITEM_ATTR}][${KEYBOARD_LIST_INDEX_ATTR}="${index}"]`;
    container.querySelector<HTMLElement>(selector)?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<T>) => {
      if (disabled || itemCount <= 0) return;

      const target = event.target as HTMLElement | null;
      if (target && isTextEntryTarget(target)) return;

      const item = target?.closest<HTMLElement>(`[${KEYBOARD_LIST_ITEM_ATTR}]`);
      const rawIndex = item?.getAttribute(KEYBOARD_LIST_INDEX_ATTR);
      const currentIndex =
        rawIndex === null || rawIndex === undefined
          ? clampIndex(activeIndex, itemCount)
          : clampIndex(Number(rawIndex), itemCount);

      const forwardKey = orientation === "horizontal" ? "ArrowRight" : "ArrowDown";
      const backwardKey = orientation === "horizontal" ? "ArrowLeft" : "ArrowUp";

      let nextIndex: number | null = null;

      switch (event.key) {
        case forwardKey:
          nextIndex = currentIndex + 1;
          break;
        case backwardKey:
          nextIndex = currentIndex - 1;
          break;
        case "Home":
          nextIndex = 0;
          break;
        case "End":
          nextIndex = itemCount - 1;
          break;
        case "Enter":
        case " ":
          event.preventDefault();
          onActivate?.(currentIndex);
          return;
        case "Escape":
          if (!onEscape) return;
          event.preventDefault();
          onEscape();
          return;
        default:
          return;
      }

      event.preventDefault();

      if (loop) {
        nextIndex = (nextIndex + itemCount) % itemCount;
      } else {
        nextIndex = clampIndex(nextIndex, itemCount);
      }

      if (nextIndex === currentIndex) return;

      setActiveIndexState(nextIndex);
      focusItem(nextIndex);
    },
    [
      activeIndex,
      disabled,
      focusItem,
      itemCount,
      loop,
      onActivate,
      onEscape,
      orientation,
    ],
  );

  const containerProps = useMemo<KeyboardListContainerProps<T>>(
    () => ({ ref: containerRef, onKeyDown: handleKeyDown }),
    [handleKeyDown],
  );

  return { activeIndex, setActiveIndex, getItemProps, containerProps };
}
