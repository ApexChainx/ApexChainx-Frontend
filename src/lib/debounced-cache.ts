/** ApexChain Network Operations Intelligence Platform */
/**
 * Debounced Cache Writer — coalesces rapid IndexedDB writes
 *
 * Issue #567 — Persisted cache writes are not debounced; rapid list filtering
 * rewrites IndexedDB on every keystroke.
 *
 * This module provides a debounced version of persistedCache.set that coalesces
 * writes within a configurable window (default 500ms), only storing the final
 * settled value.
 */

import { persistedCache } from "@/lib/persisted-cache";

interface PendingWrite<T> {
  key: string;
  data: T;
  ttlMs: number;
  resolve: () => void;
  reject: (err: Error) => void;
}

const pendingWrites = new Map<string, PendingWrite<unknown>>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

const DEFAULT_DEBOUNCE_MS = 500;

/**
 * Schedule a debounced write to IndexedDB
 * Multiple calls with the same key within the debounce window will be coalesced
 */
export function debouncedCacheSet<T>(
  key: string,
  data: T,
  ttlMs = 1000 * 60 * 30,
  debounceMs = DEFAULT_DEBOUNCE_MS
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Store the latest write for this key
    pendingWrites.set(key, { key, data, ttlMs, resolve, reject });

    // Schedule flush
    if (flushTimer) {
      clearTimeout(flushTimer);
    }
    flushTimer = setTimeout(() => {
      void flushPendingWrites();
    }, debounceMs);
  });
}

/**
 * Immediately flush all pending writes
 */
export async function flushPendingWrites(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  const writes = Array.from(pendingWrites.values());
  pendingWrites.clear();

  await Promise.all(
    writes.map(async (write) => {
      try {
        await persistedCache.set(write.key, write.data, write.ttlMs);
        write.resolve();
      } catch (err) {
        write.reject(err instanceof Error ? err : new Error(String(err)));
      }
    })
  );
}

/**
 * Cancel a pending write for a specific key
 */
export function cancelPendingWrite(key: string): void {
  const pending = pendingWrites.get(key);
  if (pending) {
    pending.reject(new Error("Cancelled"));
    pendingWrites.delete(key);
  }
}

/**
 * Get count of pending writes (for testing)
 */
export function getPendingWriteCount(): number {
  return pendingWrites.size;
}