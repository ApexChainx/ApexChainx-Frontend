"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";

import { fetchDashboardMetrics, type DashboardFilters } from "@/services/dashboardService";
import { persistedCache, clearOldSchemaVersions } from "@/lib/persisted-cache";
import { debouncedCacheSet } from "@/lib/debounced-cache";
import { slaEventKeys } from "@/lib/query-keys";
import type { DashboardMetrics } from "@/types/dashboard";

const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes
const CACHE_WRITE_DEBOUNCE_MS = 500;

function cacheKey(filters: DashboardFilters): string {
  return `dashboard-metrics:${JSON.stringify(filters)}`;
}

export function useDashboardMetrics(filters: DashboardFilters = {}) {
  const queryClient = useQueryClient();
  const hydratedRef = useRef(false);

  const normalizedFilters = useMemo<DashboardFilters>(
    () => ({
      date_from: filters.date_from?.trim() || undefined,
      date_to: filters.date_to?.trim() || undefined,
      severity: filters.severity?.trim() || undefined,
      site: filters.site?.trim() || undefined,
    }),
    [filters.date_from, filters.date_to, filters.severity, filters.site],
  );

  const queryKey = useMemo(
    () => slaEventKeys.dashboard(normalizedFilters),
    [normalizedFilters],
  );
  const cacheKeyStr = useMemo(() => cacheKey(normalizedFilters), [normalizedFilters]);

  // Clear old schema versions on bootstrap
  useEffect(() => {
    void clearOldSchemaVersions();
  }, []);

  // Hydrate from IndexedDB on first mount
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    let mounted = true;

    persistedCache.get<DashboardMetrics>(cacheKeyStr).then((cached) => {
      if (!mounted) return;
      if (cached) {
        const existing = queryClient.getQueryData<DashboardMetrics>(queryKey);
        if (!existing) {
          queryClient.setQueryData(queryKey, cached);
        }
      }
    }).catch(() => {});

    return () => {
      mounted = false;
    };
  }, [queryClient, queryKey, cacheKeyStr]);

  const query = useQuery<DashboardMetrics, Error>({
    queryKey,
    queryFn: async ({ signal }) => {
      const data = await fetchDashboardMetrics(normalizedFilters);

      // Persist with debouncing
      void debouncedCacheSet(cacheKeyStr, data, CACHE_TTL_MS, CACHE_WRITE_DEBOUNCE_MS);

      return data;
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    retry: 2,
    refetchOnWindowFocus: false,
    enabled: Object.keys(normalizedFilters).length > 0,
  });

  return query;
}