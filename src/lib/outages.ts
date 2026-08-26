import { api } from "@/lib/api";
import { DEFAULT_OUTAGES_PAGE_SIZE } from "@/lib/urlState";
import type { PaginatedOutages } from "@/types/outages";

export interface Outage {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  status: "open" | "resolved";
  started_at: string;
  resolved_at?: string;
  mttr_minutes?: number;
  sla_result?: {
    status: "met" | "violated";
    amount: number;
    rating: string;
  };
}

export interface OutagesResponse {
  items: Outage[];
  page: number;
  page_size: number;
  total: number;
}

export interface OutagesQuery {
  page: number;
  page_size?: number | undefined;
  severity?: string | undefined;
  status?: string | undefined;
  search?: string | undefined;
  sort?: string | undefined;
}

export async function fetchOutages(query: OutagesQuery): Promise<PaginatedOutages> {
  const { data } = await api.get<PaginatedOutages>("/outages", {
    params: {
      page: query.page,
      page_size: query.page_size ?? DEFAULT_OUTAGES_PAGE_SIZE,
      severity: query.severity,
      status: query.status,
      search: query.search,
      sort: query.sort,
    },
  });

  return data;
}
