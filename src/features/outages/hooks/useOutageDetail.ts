"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { getOutage } from "@/services/outages";
import { persistedCache, clearOldSchemaVersions } from "@/lib/persisted-cache";
import { debouncedCacheSet } from "@/lib/debounced-cache";
import { slaEventKeys } from "@/lib/query-keys";
import type { Outage } from "@/types/outages";

const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes
const CACHE_WRITE_DEBOUNCE_MS = 500;

function cacheKey(id: string): string {
  return `outage-detail:${id}`;
}

export function useOutageDetail(id: string | undefined) {
  const queryClient = useQueryClient();
  const hydratedRef = useRef(false);
  const cacheKeyStr = id ? cacheKey(id) : "";

  // Clear old schema versions on bootstrap
  useEffect(() => {
    void clearOldSchemaVersions();
  }, []);

  // Hydrate from IndexedDB on first mount
  useEffect(() => {
    if (!id || hydratedRef.current) return;
    hydratedRef.current = true;

    let mounted = true;

    persistedCache.get<Outage>(cacheKeyStr).then((cached) => {
      if (!mounted) return;
      if (cached) {
        const queryKey = slaEventKeys.outages.detail(id);
        const existing = queryClient.getQueryData<Outage>(queryKey);
        if (!existing) {
          queryClient.setQueryData(queryKey, cached);
        }
      }
    }).catch(() => {});

    return () => {
      mounted = false;
    };
  }, [queryClient, id, cacheKeyStr]);

  const query = useQuery<Outage, Error>({
    queryKey: slaEventKeys.outages.detail(id ?? ""),
    queryFn: async ({ signal }) => {
      if (!id) throw new Error("Outage ID is required");
      const data = await getOutage(id, { signal });

      // Persist with debouncing
      void debouncedCacheSet(cacheKeyStr, data, CACHE_TTL_MS, CACHE_WRITE_DEBOUNCE_MS);

      return data;
    },
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    retry: 2,
    refetchOnWindowFocus: false,
  });

  return query;
}