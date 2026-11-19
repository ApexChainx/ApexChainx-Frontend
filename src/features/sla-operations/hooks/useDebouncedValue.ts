/** ApexChain Network Operations Intelligence Platform */
/**
 * Debounced value hook (Issue #972).
 *
 * Delays propagating a fast-changing value, typically a search or filter
 * input, so expensive work (filtering a large table, refetching) only runs
 * once the user pauses. `debouncedValue` follows `value` after `delayMs`
 * without further changes; `isPending` is true while it is catching up and
 * `flush` applies the latest value immediately (for example on Enter).
 *
 * Values are compared with `Object.is`. For objects and arrays that are
 * recreated on every render, pass a stable reference or an `isEqual`
 * comparator, otherwise the timer restarts on every render and the debounced
 * value never settles.
 */
import { useCallback, useEffect, useMemo, useState } from "react";

/** Delay used when none is given. */
export const DEFAULT_DEBOUNCE_MS = 300;

export interface UseDebouncedValueOptions<T> {
  /** Custom equality check. Defaults to `Object.is`. */
  isEqual?: ((a: T, b: T) => boolean) | undefined;
}

export interface UseDebouncedValueResult<T> {
  /** The value as of the last pause of at least `delayMs`. */
  debouncedValue: T;
  /** True while `debouncedValue` differs from the latest `value`. */
  isPending: boolean;
  /** Apply the latest value now and cancel the pending timer. */
  flush: () => void;
}

/** A usable delay: finite and non-negative, otherwise the default. */
export function normalizeDebounceDelay(delayMs: number | null | undefined): number {
  return typeof delayMs === "number" && Number.isFinite(delayMs) && delayMs >= 0
    ? delayMs
    : DEFAULT_DEBOUNCE_MS;
}

export function useDebouncedValue<T>(
  value: T,
  delayMs: number = DEFAULT_DEBOUNCE_MS,
  options: UseDebouncedValueOptions<T> = {},
): UseDebouncedValueResult<T> {
  const delay = normalizeDebounceDelay(delayMs);
  const isEqual = options.isEqual ?? Object.is;
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const isPending = !isEqual(value, debouncedValue);

  useEffect(() => {
    if (!isPending) {
      return undefined;
    }
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
    // `isPending` already captures the comparison with `debouncedValue`.
  }, [value, delay, isPending]);

  const flush = useCallback(() => {
    setDebouncedValue(value);
  }, [value]);

  return useMemo(
    () => ({ debouncedValue, isPending, flush }),
    [debouncedValue, isPending, flush],
  );
}
