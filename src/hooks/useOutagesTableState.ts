/** ApexChain Network Operations Intelligence Platform */
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
    getPreferences,
    hydratePreferences,
    subscribeToPreferences,
    updatePreferences,
    type FilterPreset
} from "@/lib/preferences";
import { parseOutagesFilter, type SortField, type SortOrder } from "@/lib/urlState";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed to load outages";
}

export function useFilterPresets() {
  const [presets, setPresets] = useState<FilterPreset[]>(() => {
    const prefs = getPreferences();
    return prefs.outageFilterPresets ?? [];
  });

  // Hydrate from server and subscribe to changes
  useEffect(() => {
    // Hydrate preferences on mount
    hydratePreferences().then((prefs) => {
      setPresets(prefs.outageFilterPresets ?? []);
    });

    // Subscribe to preference changes
    return subscribeToPreferences((prefs) => {
      setPresets(prefs.outageFilterPresets ?? []);
    });
  }, []);

  function savePreset(preset: FilterPreset) {
    const currentPrefs = getPreferences();
    const existingPresets = currentPrefs.outageFilterPresets ?? [];
    const next = [...existingPresets.filter((p) => p.name !== preset.name), preset];
    
    // Update preferences (automatically syncs local and remote)
    updatePreferences({
      outageFilterPresets: next,
    });
  }

  function deletePreset(name: string) {
    const currentPrefs = getPreferences();
    const existingPresets = currentPrefs.outageFilterPresets ?? [];
    const next = existingPresets.filter((p) => p.name !== name);
    
    // Update preferences (automatically syncs local and remote)
    updatePreferences({
      outageFilterPresets: next,
    });
  }

  return { presets, savePreset, deletePreset };
}

export interface OutagesTableState {
  page: number;
  page_size: number;
  severity?: string | undefined;
  status?: string | undefined;
  search?: string | undefined;
  sort_field?: SortField | undefined;
  sort_order: SortOrder;
}

export interface OutagesTableActions {
  setParam: (key: string, value?: string) => void;
  setPage: (nextPage: number) => void;
  setPageSize: (nextPageSize: number) => void;
  setSeverity: (nextSeverity?: string) => void;
  setStatus: (nextStatus?: string) => void;
  setSearch: (nextSearch?: string) => void;
  setSort: (field: SortField, order: SortOrder) => void;
  clearSort: () => void;
}

/**
 * Table state manager — the query string is the single source of truth for
 * filters, search, sort, and pagination.
 *
 * Issue #638: the outages list used to keep its filter/sort state in component
 * memory, so a triage view was lost on reload, could not be shared, and was
 * reset by a back-navigation from an outage detail page. The state is now
 * *derived* from the URL on every render (never synced into local state via an
 * effect), which means restored filters are already in place on the first
 * render and the list fetches exactly once.
 *
 * Data fetching is delegated to the useOutages hook (Issue #573).
 */
export function useOutagesTableState(): {
  state: OutagesTableState;
  actions: OutagesTableActions;
} {
  const params = useSearchParams();
  const router = useRouter();

  const filter = parseOutagesFilter(params || new URLSearchParams());
  const currentQuery = params?.toString() ?? "";

  /**
   * Rewrite the current query string. High-frequency updates (`setSearch`,
   * called on every keystroke) replace the history entry instead of pushing a
   * new one, so Back returns to the previous page rather than the previous
   * keystroke.
   */
  const navigate = useCallback(
    (
      updates: Record<string, string | undefined>,
      mode: "push" | "replace" = "push",
    ) => {
      const next = new URLSearchParams(currentQuery);
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          next.set(key, value);
        } else {
          next.delete(key);
        }
      }
      const href = `?${next.toString()}`;
      if (mode === "replace") {
        router.replace(href, { scroll: false });
      } else {
        router.push(href, { scroll: false });
      }
    },
    [currentQuery, router],
  );

  const actions = useMemo<OutagesTableActions>(
    () => ({
      setParam: (key, value) => navigate({ [key]: value }),
      setPage: (nextPage) =>
        navigate({ page: String(Math.max(1, nextPage)) }),
      setPageSize: (nextPageSize) =>
        navigate({ page_size: String(nextPageSize), page: "1" }),
      setSeverity: (nextSeverity) =>
        navigate({ severity: nextSeverity, page: "1" }),
      setStatus: (nextStatus) => navigate({ status: nextStatus, page: "1" }),
      // FE-058
      setSearch: (nextSearch) =>
        navigate({ search: nextSearch || undefined, page: "1" }, "replace"),
      // FE-059
      setSort: (field, order) =>
        navigate({ sort_field: field, sort_order: order, page: "1" }),
      clearSort: () =>
        navigate({ sort_field: undefined, sort_order: undefined, page: "1" }),
    }),
    [navigate],
  );

  return {
    state: {
      page: filter.page,
      page_size: filter.page_size,
      severity: filter.severity,
      status: filter.status,
      search: filter.search,
      sort_field: filter.sort_field,
      sort_order: filter.sort_order,
    },
    actions,
  };
}
