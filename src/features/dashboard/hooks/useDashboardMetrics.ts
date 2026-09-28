"use client";

import { useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

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

/**
 * Issue #605 — the dashboard is the first screen an operator opens after
 * reconnecting, so a network blip must not leave it blank. The query result is
 * annotated with `isStaleSnapshot`: true while the page is rendering the
 * persisted snapshot because the live request has not succeeded.
 */
export type DashboardMetricsQuery = UseQueryResult<DashboardMetrics, Error> & {
  isStaleSnapshot: boolean;
};

export function useDashboardMetrics(filters: DashboardFilters = {}): DashboardMetricsQuery {
  const queryClient = useQueryClient();
  const hydratedRef = useRef(false);
  const [hydratedFromCache, setHydratedFromCache] = useState(false);

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
          setHydratedFromCache(true);
        }
      }
    }).catch(() => {});

    return () => {
      mounted = false;
    };
  }, [queryClient, queryKey, cacheKeyStr]);

  const query = useQuery<DashboardMetrics, Error>({
    queryKey,
    queryFn: async () => {
      const data = await fetchDashboardMetrics(normalizedFilters);

      // Persist with debouncing
      void debouncedCacheSet(cacheKeyStr, data, CACHE_TTL_MS, CACHE_WRITE_DEBOUNCE_MS);

      return data;
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    retry: 2,
    refetchOnWindowFocus: false,
    // Issue #605 — the dashboard must load with no filters selected. (The
    // previous gate compared `Object.keys` on a normalized object that always
    // carries all four keys, so it never actually disabled the query.)
    enabled: true,
    structuralSharing: (oldData: unknown, newData: unknown) => {
      if (!oldData || !newData) return newData as DashboardMetrics;
      const o = oldData as DashboardMetrics;
      const n = newData as DashboardMetrics;
      if (o.sla_compliance_percentage === n.sla_compliance_percentage &&
          o.penalties.total === n.penalties.total &&
          o.rewards.total === n.rewards.total) {
        return o;
      }
      return n;
    },
  });

  // We are showing a snapshot whenever the persisted copy hydrated and the
  // live request has since failed (offline, or the metrics endpoint is down).
  // `failureCount` is checked rather than `isError` alone because React Query
  // keeps the previously hydrated `data` and retries in the background, and the
  // operator should be told the figures are cached from the first failed
  // attempt rather than after the retry budget is exhausted.
  const isStaleSnapshot =
    hydratedFromCache && query.data != null && (query.isError || query.failureCount > 0);

  return { ...query, isStaleSnapshot };
}