"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";

import { fetchPayments } from "@/services/paymentService";
import { persistedCache } from "@/lib/persisted-cache";
import { slaEventKeys } from "@/lib/query-keys";
import type { PaginatedPayments } from "@/types/payment";
import type { PaymentFilters } from "@/services/paymentService";

export interface UsePaymentsParams extends PaymentFilters {}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const CACHE_TTL_MS = 1000 * 60 * 30;

function cacheKey(params: UsePaymentsParams): string {
  return `payments:${JSON.stringify(params)}`;
}

export function usePayments(params: UsePaymentsParams = {}) {
  const queryClient = useQueryClient();
  const hydratedRef = useRef(false);

  const normalizedParams = useMemo<UsePaymentsParams>(
    () => ({
      page: params.page ?? DEFAULT_PAGE,
      page_size: params.page_size ?? DEFAULT_PAGE_SIZE,
      status: params.status?.trim() || undefined,
      type: params.type?.trim() || undefined,
      date_from: params.date_from?.trim() || undefined,
      date_to: params.date_to?.trim() || undefined,
      sort_by: params.sort_by,
      sort_dir: params.sort_dir,
    }),
    [
      params.page,
      params.page_size,
      params.status,
      params.type,
      params.date_from,
      params.date_to,
      params.sort_by,
      params.sort_dir,
    ],
  );

  const queryKey = useMemo(
    () => slaEventKeys.payments.list(normalizedParams as Record<string, unknown>),
    [normalizedParams],
  );
  const cacheKeyStr = useMemo(() => cacheKey(normalizedParams), [normalizedParams]);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    let mounted = true;

    persistedCache.get<PaginatedPayments>(cacheKeyStr).then((cached) => {
      if (!mounted) return;
      if (cached) {
        const existing = queryClient.getQueryData<PaginatedPayments>(queryKey);
        if (!existing) {
          queryClient.setQueryData(queryKey, cached);
        }
      }
    }).catch(() => {
    });

    return () => {
      mounted = false;
    };
  }, [queryClient, queryKey, cacheKeyStr]);

  const query = useQuery<PaginatedPayments, Error>({
    queryKey,

    queryFn: async ({ signal }) => {
      const data = await fetchPayments(normalizedParams as PaymentFilters, { signal });

      void persistedCache.set(cacheKeyStr, data, CACHE_TTL_MS);

      return data;
    },

    placeholderData: keepPreviousData,

    staleTime: 1000 * 60 * 5,

    gcTime: 1000 * 60 * 10,

    retry: 2,

    refetchOnWindowFocus: false,

    enabled: (normalizedParams.page ?? 1) > 0,

    select: (data) => ({
      ...data,
      items: data.items ?? [],
    }),
  });

  return query;
}