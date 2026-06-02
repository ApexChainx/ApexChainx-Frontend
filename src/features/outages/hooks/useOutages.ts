import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchOutages } from "@/lib/outages";
import type { PaginatedOutages } from "@/types/outages";

export interface UseOutagesParams {
  page?: number;
  page_size?: number;
  severity?: string;
  status?: string;
  search?: string;
  sort?: string;
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;

export function useOutages(params: UseOutagesParams = {}) {
  const normalizedParams: UseOutagesParams = {
    page: params.page ?? DEFAULT_PAGE,
    page_size: params.page_size ?? DEFAULT_PAGE_SIZE,
    severity: params.severity?.trim() || undefined,
    status: params.status?.trim() || undefined,
    search: params.search?.trim() || undefined,
    sort: params.sort?.trim() || undefined,
  };

  return useQuery<PaginatedOutages, Error>({
    queryKey: ["outages", normalizedParams],

    queryFn: ({ signal }) =>
      fetchOutages(normalizedParams, { signal }),

    placeholderData: keepPreviousData,

    staleTime: 1000 * 60 * 5, // 5 minutes

    gcTime: 1000 * 60 * 10, // 10 minutes

    retry: 2,

    refetchOnWindowFocus: false,

    enabled: normalizedParams.page > 0,

    select: (data) => ({
      ...data,
      items: data.items ?? [],
    }),
  });
}