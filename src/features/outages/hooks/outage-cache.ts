/** ApexChain Network Operations Intelligence Platform */
/**
 * Issue #571 / #572 — React Query cache helpers for the outage detail route.
 *
 * The outage detail page performs its own fetching (a hand-rolled poll loop)
 * rather than going through `useOutage`, so it owns the job of keeping the
 * shared cache honest. Two invariants matter:
 *
 *  1. After an edit, resolve or delete succeeds, the cached *list* queries
 *     must be marked stale. Without this, navigating back to /outages serves
 *     `keepPreviousData` rows from before the mutation and a just-resolved
 *     outage still reads as open.
 *  2. A deleted outage must be *removed* from the cache, not merely
 *     invalidated. Invalidation only marks an entry stale; if the entry has
 *     no active observer (we are about to navigate away) React Query will
 *     happily serve the resurrected incident until `gcTime` expires.
 *
 * Both are extracted here so the page body stays declarative and so the
 * exact query keys being touched are unit-testable without mounting React.
 */

import type { QueryClient } from "@tanstack/react-query";

import { slaEventKeys } from "@/lib/query-keys";
import type { Outage } from "@/types/outages";

/**
 * Drop the cached detail entry for `id` outright.
 *
 * `exact: true` matters: `slaEventKeys.outages.detail(id)` is
 * `["sla-events", "outages", id]`, and prefix matching would also swallow
 * any other `outages` entry whose third segment starts with that id.
 */
export function removeOutageFromCache(
  queryClient: QueryClient,
  id: string,
): void {
  queryClient.removeQueries({
    queryKey: slaEventKeys.outages.detail(id),
    exact: true,
  });
}

/**
 * Mark every cached outage *list* page stale, regardless of the filter and
 * pagination params it was stored under.
 *
 * `slaEventKeys.outages.lists` is the params-independent prefix
 * `["sla-events", "outages", "list"]`. Calling `slaEventKeys.outages.list()`
 * instead would produce `["sla-events", "outages", "list", undefined]`, and
 * React Query's prefix matcher compares segment-by-segment — the trailing
 * `undefined` would fail to match every real `list(params)` entry, silently
 * invalidating nothing.
 *
 * Deliberately *not* `slaEventKeys.outages.all`: that would also hit the
 * detail entries, which the mutate-then-set path already reconciled.
 */
export function invalidateOutageListCaches(
  queryClient: QueryClient,
): Promise<void> {
  return queryClient.invalidateQueries({
    queryKey: slaEventKeys.outages.lists,
  });
}

/**
 * Write the authoritative server response for an outage into the detail
 * cache so a later remount (or a back-navigation) renders it immediately
 * instead of refetching.
 */
export function setOutageDetailCache(
  queryClient: QueryClient,
  outage: Outage,
): void {
  queryClient.setQueryData(slaEventKeys.outages.detail(outage.id), outage);
}
