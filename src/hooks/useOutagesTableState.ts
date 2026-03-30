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

// Existing state manager
export function useOutagesTableState() {
  const params = useSearchParams();
  const router = useRouter();

  const page = Number(params?.get("page") ?? 1);
  const pageSize = Number(params?.get("page_size") ?? 10);
  const severity = params?.get("severity") ?? undefined;
  const status = params?.get("status") ?? undefined;

  function setParam(key: string, value?: string) {
    const next = new URLSearchParams(params?.toString() ?? "");

    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }

    router.push(`?${next.toString()}`);
  }

  function setPage(nextPage: number) {
    setParam("page", String(Math.max(1, nextPage)));
  }

  function setPageSize(nextPageSize: number) {
    setParam("page_size", String(nextPageSize));
    setParam("page", "1");
  }

  function setSeverity(nextSeverity?: string) {
    setParam("severity", nextSeverity);
    setParam("page", "1");
  }

  function setStatus(nextStatus?: string) {
    setParam("status", nextStatus);
    setParam("page", "1");
  }

  return {
    state: {
      page,
      page_size: pageSize,
      severity,
      status,
    },
    actions: {
      setParam,
      setPage,
      setPageSize,
      setSeverity,
      setStatus,
    },
  };
}

// New data fetching & polling hook for the Outages list
export function useOutagesList(
  page: number,
  severity?: string,
  status?: string,
  pageSize: number = 10,
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
  }, [page, pageSize, severity, status]);

  return { outages, loading, error };
}
