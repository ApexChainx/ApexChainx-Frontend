/** ApexChain Network Operations Intelligence Platform */

export type SortField = "detected_at" | "severity" | "status";
export type SortOrder = "asc" | "desc";

export const VALID_SORT_FIELDS: SortField[] = ["detected_at", "severity", "status"];
export const VALID_SORT_ORDERS: SortOrder[] = ["asc", "desc"];

export const MIN_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

function normalizePage(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= MIN_PAGE ? Math.floor(n) : MIN_PAGE;
}

function normalizePageSize(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < MIN_PAGE) return DEFAULT_PAGE_SIZE;
  return Math.min(Math.floor(n), MAX_PAGE_SIZE);
}

export interface OutagesFilter {
  page: number;
  page_size: number;
  severity?: string | undefined;
  status?: string | undefined;
  search?: string | undefined;
  sort_field?: SortField | undefined;
  sort_order: SortOrder;
}

export function parseOutagesFilter(params: URLSearchParams | { get: (name: string) => string | null }): OutagesFilter {
  const sortFieldRaw = params.get("sort_field");
  const sortOrderRaw = params.get("sort_order");
  
  return {
    page: normalizePage(params.get("page") ?? MIN_PAGE),
    page_size: normalizePageSize(params.get("page_size") ?? DEFAULT_PAGE_SIZE),
    severity: params.get("severity") ?? undefined,
    status: params.get("status") ?? undefined,
    search: params.get("search") ?? undefined,
    sort_field: VALID_SORT_FIELDS.includes(sortFieldRaw as SortField) ? (sortFieldRaw as SortField) : undefined,
    sort_order: VALID_SORT_ORDERS.includes(sortOrderRaw as SortOrder) ? (sortOrderRaw as SortOrder) : "desc",
  };
}

export function serializeOutagesFilter(filter: Partial<OutagesFilter>): URLSearchParams {
  const params = new URLSearchParams();
  if (filter.page !== undefined) params.set("page", String(normalizePage(filter.page)));
  if (filter.page_size !== undefined) params.set("page_size", String(normalizePageSize(filter.page_size)));
  if (filter.severity) params.set("severity", filter.severity);
  if (filter.status) params.set("status", filter.status);
  if (filter.search) params.set("search", filter.search);
  if (filter.sort_field) params.set("sort_field", filter.sort_field);
  if (filter.sort_order) params.set("sort_order", filter.sort_order);
  return params;
}
