/** ApexChain Network Operations Intelligence Platform */
/**
 * Pagination utilities (Issue #923).
 *
 * Pure calculation helpers for client-side operation views: page counts,
 * normalised page/page-size values, slice metadata and a convenience
 * `paginate` helper. Invalid input is normalised rather than throwing.
 */

/** Raw pagination inputs, typically read from query state. */
export interface PaginationParams {
  page: number;
  pageSize: number;
  total: number;
}

/** Metadata describing the resolved page and its slice of the dataset. */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  /** Zero-based index of the first item on the current page. */
  startIndex: number;
  /** Zero-based exclusive index of the last item on the current page. */
  endIndex: number;
  /** 1-based position of the first item, or 0 for an empty page. */
  firstItem: number;
  /** 1-based position of the last item. */
  lastItem: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/** A paginated slice together with its metadata. */
export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/** Number of pages needed to display `total` items, or 0 when empty. */
export function getTotalPages(total: number, pageSize: number): number {
  if (!Number.isFinite(total) || total <= 0) {
    return 0;
  }
  if (!Number.isFinite(pageSize) || pageSize <= 0) {
    return 0;
  }
  return Math.ceil(total / pageSize);
}

/** Clamp a page number into `[1, totalPages]`. */
export function normalizePage(page: number, totalPages: number): number {
  if (!Number.isFinite(page) || page < 1) {
    return 1;
  }
  const floored = Math.floor(page);
  return totalPages > 0 ? Math.min(floored, totalPages) : floored;
}

/** Clamp a page size into `[1, max]`, falling back to the default. */
export function normalizePageSize(size: number, max = MAX_PAGE_SIZE): number {
  if (!Number.isFinite(size) || size < 1) {
    return DEFAULT_PAGE_SIZE;
  }
  const upperBound = Number.isFinite(max) && max >= 1 ? max : MAX_PAGE_SIZE;
  return Math.min(Math.floor(size), upperBound);
}

/** Resolve full pagination metadata from raw inputs. */
export function getPaginationMeta(params: PaginationParams): PaginationMeta {
  const pageSize = normalizePageSize(params.pageSize);
  const total =
    Number.isFinite(params.total) && params.total > 0
      ? Math.floor(params.total)
      : 0;
  const totalPages = getTotalPages(total, pageSize);
  const page = normalizePage(params.page, totalPages);
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, total);
  const itemCount = Math.max(0, endIndex - startIndex);

  return {
    page,
    pageSize,
    total,
    totalPages,
    startIndex,
    endIndex,
    firstItem: itemCount === 0 ? 0 : startIndex + 1,
    lastItem: endIndex,
    hasNext: page < totalPages,
    hasPrevious: page > 1 && totalPages > 0,
  };
}

/** Slice a dataset into the requested page. */
export function paginate<T>(
  items: readonly T[],
  page: number,
  pageSize: number,
): PaginatedResult<T> {
  const meta = getPaginationMeta({ page, pageSize, total: items.length });
  return {
    items: items.slice(meta.startIndex, meta.endIndex),
    meta,
  };
}
