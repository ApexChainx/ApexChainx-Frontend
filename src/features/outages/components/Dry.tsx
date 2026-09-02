"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { getOutages } from "@/services/outages";
import type { Outage } from "@/types/outages";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed to load outages";
}

const PRESETS_KEY = "outage_filter_presets";

export interface FilterPreset {
  name: string;
  severity?: string;
  status?: string;
}

export function useFilterPresets() {
  const [presets, setPresets] = useState<FilterPreset[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(PRESETS_KEY) ?? "[]") as FilterPreset[];
    } catch {
      return [];
    }
  });

  function savePreset(preset: FilterPreset) {
    setPresets((prev) => {
      const next = [...prev.filter((p) => p.name !== preset.name), preset];
      localStorage.setItem(PRESETS_KEY, JSON.stringify(next));
      return next;
    });
  }

  function deletePreset(name: string) {
    setPresets((prev) => {
      const next = prev.filter((p) => p.name !== name);
      localStorage.setItem(PRESETS_KEY, JSON.stringify(next));
      return next;
    });
  }

  return { presets, savePreset, deletePreset };
}

export type SortField = "detected_at" | "severity" | "status";
export type SortOrder = "asc" | "desc";

const VALID_SORT_FIELDS: SortField[] = ["detected_at", "severity", "status"];
const VALID_SORT_ORDERS: SortOrder[] = ["asc", "desc"];

function parseSortField(v: string | null): SortField | undefined {
  return VALID_SORT_FIELDS.includes(v as SortField) ? (v as SortField) : undefined;
}

function parseSortOrder(v: string | null): SortOrder {
  return VALID_SORT_ORDERS.includes(v as SortOrder) ? (v as SortOrder) : "desc";
}

// Existing state manager — extended with search + sort + full URL sync (FE-058, FE-059, FE-060)
export function useOutagesTableState() {
  const params = useSearchParams();
  const router = useRouter();

  const page = Math.max(1, Number(params?.get("page") ?? 1));
  const pageSize = Number(params?.get("page_size") ?? 10);
  const severity = params?.get("severity") ?? undefined;
  const status = params?.get("status") ?? undefined;
  // FE-058: search query
  const search = params?.get("search") ?? undefined;
  // FE-059: sort field + order
  const sortField = parseSortField(params?.get("sort_field") ?? null);
  const sortOrder = parseSortOrder(params?.get("sort_order") ?? null);

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
