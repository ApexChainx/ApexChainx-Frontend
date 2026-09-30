"use client";
/** ApexChain Network Operations Intelligence Platform */

import { useDebounce } from "@/hooks/useDebounce";
import { useOutagesTableState } from "@/hooks/useOutagesTableState";
import { RouteLoadingState } from "@/components/ui/route-state";
import { useOutages } from "@/features/outages/hooks/useOutages";
import { getSiteDisplayTitle } from "@/lib/site-display";
import OutagesPageClient from "./outages-page-client";

/**
 * Display shape the list UI renders. The API model names these fields
 * `site_name` / `detected_at`; the existing list client was built around
 * `title` / `createdAt`, so map here rather than churning the client.
 */
type ClientOutage = {
  id: string;
  title: string;
  site_name: string;
  status: string;
  createdAt: string;
  assigned_to?: string;
};

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Connects the /outages route to `useOutages`, the offline-first data path:
 * successful fetches are persisted to IndexedDB and the hook hydrates from
 * that store on mount, so an operator who loses connectivity still sees the
 * last-known outage list.
 *
 * Issue #638 — search, sort, and the severity/status filters are derived from
 * the query string rather than held in component memory, so a triage view
 * survives a reload, can be bookmarked or shared, and is restored by a
 * back-navigation from an outage detail page. Because the state is *derived*
 * from the URL (never copied into local state by an effect), the restored
 * filters are already in place on the first render and the list fetches once —
 * there is no reconcile-then-refetch double request.
 */
export default function OutagesConnectedList() {
  const { state, actions } = useOutagesTableState();

  const rawSearch = state.search ?? "";
  const debouncedSearch = useDebounce(rawSearch, SEARCH_DEBOUNCE_MS);

  const { data, isLoading, isFetching } = useOutages({
    search: debouncedSearch || undefined,
    severity: state.severity,
    status: state.status,
  });

  const items: ClientOutage[] = (data?.items ?? []).map((outage) => ({
    id: outage.id,
    title: getSiteDisplayTitle(outage.site_name),
    site_name: outage.site_name,
    status: outage.status,
    createdAt: outage.detected_at,
    ...(outage.assigned_to !== undefined
      ? { assigned_to: outage.assigned_to }
      : {}),
  }));

  // First paint has nothing yet: wait for the network fetch or the IndexedDB
  // hydration before showing the (empty) table chrome.
  if (isLoading && items.length === 0) {
    return (
      <RouteLoadingState
        title="Loading outages"
        description="Gathering the latest incidents and preparing the outage table."
      />
    );
  }

  return (
    <OutagesPageClient
      data={items}
      isFetching={isFetching}
      searchTerm={rawSearch}
      debouncedSearch={debouncedSearch}
      sort={{ field: state.sort_field ?? "detected_at", order: state.sort_order }}
      onSortChange={actions.setSort}
      onSearchChange={actions.setSearch}
    />
  );
}
