/** ApexChain Network Operations Intelligence Platform */
/**
 * Session Snapshot — Clear all cache surfaces on logout
 *
 * Issue #559 — No cache entries are purged on logout across any cache surface
 * (IndexedDB, React Query, service worker).
 *
 * This module provides a single clearSessionSnapshot function that should be
 * called whenever the user signs out (via clearSession in SessionProvider).
 */

import { persistedCache, clearOldSchemaVersions } from "@/lib/persisted-cache";
import { mutationQueue } from "@/lib/mutation-queue";
import { QueryClient } from "@tanstack/react-query";

let queryClientRef: QueryClient | null = null;

/**
 * Register the React Query client for cache clearing
 * Call this during app initialization
 */
export function registerQueryClient(client: QueryClient): void {
  queryClientRef = client;
}

/**
 * Clear all cache surfaces on logout:
 * 1. IndexedDB persisted cache
 * 2. React Query in-memory cache (including placeholder/keepPreviousData)
 * 3. Mutation queue
 * 4. Service worker page-shell cache (via message)
 */
export async function clearSessionSnapshot(): Promise<void> {
  // 1. Clear IndexedDB persisted cache
  await persistedCache.clear();

  // 2. Clear old schema versions (cleanup)
  await clearOldSchemaVersions();

  // 3. Clear React Query cache if registered
  if (queryClientRef) {
    // Clear all queries including placeholder data
    queryClientRef.clear();
  }

  // 4. Clear mutation queue
  await mutationQueue.clear();

  // 5. Tell service worker to drop page-shell entries
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.ready;
    if (registration.active) {
      registration.active.postMessage({ type: "CLEAR_SESSION_CACHE" });
    }
  }
}

/**
 * Clear only the React Query cache (for cases where IndexedDB should persist)
 */
export function clearQueryCache(): void {
  if (queryClientRef) {
    queryClientRef.clear();
  }
}