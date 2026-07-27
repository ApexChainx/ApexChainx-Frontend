/** ApexChain Network Operations Intelligence Platform */
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
    getPreferences,
    hydratePreferences,
    subscribeToPreferences,
    updatePreferences,
    type FilterPreset
} from "@/lib/preferences";
import { getOutages } from "@/services/outages";
import type { Outage } from "@/types/outages";

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

import { parseOutagesFilter, type SortField, type SortOrder } from "@/lib/urlState";

// Existing state manager — extended with search + sort + full URL sync (FE-058, FE-059, FE-060)
export function useOutagesTableState() {
  const params = useSearchParams();
  const router = useRouter();

  const filter = parseOutagesFilter(params || new URLSearchParams());
  
  const page = filter.page;
  const pageSize = filter.page_size;
  const severity = filter.severity;
  const status = filter.status;
  // FE-058: search query
  const search = filter.search;
  // FE-059: sort field + order
  const sortField = filter.sort_field;
  const sortOrder = filter.sort_order;

  function setParam(key: string, value?: string) {
    const next = new URLSearchParams(params?.toString() ?? "");
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    router.push(`?${next.toString()}`);
  }

  function setMultiParam(updates: Record<string, string | undefined>) {
    const next = new URLSearchParams(params?.toString() ?? "");
    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    }
    router.push(`?${next.toString()}`);
  }

  function setPage(nextPage: number) {
    setParam("page", String(Math.max(1, nextPage)));
  }

  function setPageSize(nextPageSize: number) {
    setMultiParam({ page_size: String(nextPageSize), page: "1" });
  }

  function setSeverity(nextSeverity?: string) {
    setMultiParam({ severity: nextSeverity, page: "1" });
  }

  function setStatus(nextStatus?: string) {
    setMultiParam({ status: nextStatus, page: "1" });
  }

  // FE-058
  function setSearch(nextSearch?: string) {
    setMultiParam({ search: nextSearch || undefined, page: "1" });
  }

  // FE-059
  function setSort(field: SortField, order: SortOrder) {
    setMultiParam({ sort_field: field, sort_order: order, page: "1" });
  }

  function clearSort() {
    setMultiParam({ sort_field: undefined, sort_order: undefined, page: "1" });
  }

  return {
    state: {
      page,
      page_size: pageSize,
      severity,
      status,
      search,
      sort_field: sortField,
      sort_order: sortOrder,
    },
    actions: {
      setParam,
      setPage,
      setPageSize,
      setSeverity,
      setStatus,
      setSearch,
      setSort,
      clearSort,
    },
  };
}

// New data fetching & polling hook for the Outages list
export function useOutagesList(
  page: number,
  severity?: string,
  status?: string,
  pageSize: number = 10,
  search?: string,
  sortField?: SortField,
  sortOrder?: SortOrder,
) {
  const [outages, setOutages] = useState<Outage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const isFetching = useRef(false);
  const hasOutagesRef = useRef(false);

  useEffect(() => {
    hasOutagesRef.current = outages.length > 0;
  }, [outages]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const fetchList = async () => {
      if (isFetching.current) return;
      isFetching.current = true;

      try {
        const data = await getOutages({
          page,
          page_size: pageSize,
          severity,
          status,
          search,
          sort_field: sortField,
          sort_order: sortOrder,
        });
        if (isMounted) {
          setOutages(data.items);
          setError(null);
        }
      } catch (error: unknown) {
        if (isMounted && !hasOutagesRef.current) {
          setError(getErrorMessage(error));
        }
      } finally {
        isFetching.current = false;
        if (isMounted) setLoading(false);
      }
    };

    fetchList();

    // The list page constantly polls every 15 seconds to ensure we 
    // catch any newly generated incidents as well as updates to existing ones.
    const intervalId = setInterval(fetchList, 15000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [page, pageSize, severity, status, search, sortField, sortOrder]);

  return { outages, loading, error };
}