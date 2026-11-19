/** ApexChain Network Operations Intelligence Platform */
/**
 * Pagination state hook (Issue #973).
 *
 * Owns the current page and page size for a client-side table and exposes the
 * resolved metadata from `../utils/pagination`. The page is always clamped to
 * `[1, totalPages]`, so a dataset that shrinks (a filter is applied, rows are
 * deleted) can never leave the view on a page that no longer exists, and no
 * effect is needed to correct it. Changing the page size keeps the first
 * visible item on screen.
 */
import { useCallback, useMemo, useState } from "react";

import {
  getPaginationMeta,
  normalizePage,
  normalizePageSize,
  type PaginationMeta,
} from "../utils/pagination";

export interface UsePaginationStateOptions {
  /** Total number of items across all pages. Invalid values count as 0. */
  total: number;
  /** Page shown first (1-based). Defaults to 1. */
  initialPage?: number | undefined;
  /** Items per page. Defaults to 20, capped at 100 by the pagination utilities. */
  initialPageSize?: number | undefined;
}

export interface UsePaginationStateResult {
  /** Resolved, clamped page (1-based). */
  page: number;
  pageSize: number;
  totalPages: number;
  meta: PaginationMeta;
  /** Go to a page; out-of-range and invalid values are clamped. */
  setPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  firstPage: () => void;
  lastPage: () => void;
  /** Change the page size, keeping the first visible item on screen. */
  setPageSize: (pageSize: number) => void;
  /** Return to the initial page and page size. */
  reset: () => void;
  /** Slice a full dataset down to the current page. */
  paginateItems: <T>(items: readonly T[]) => T[];
}

interface RawState {
  page: number;
  pageSize: number;
}

export function usePaginationState(
  options: UsePaginationStateOptions,
): UsePaginationStateResult {
  const initialPage = options.initialPage ?? 1;
  const initialPageSize = normalizePageSize(options.initialPageSize ?? Number.NaN);

  const [state, setState] = useState<RawState>({
    page: initialPage,
    pageSize: initialPageSize,
  });

  // `normalizePage` leaves the page untouched when there are no pages, so an
  // empty dataset is pinned to page 1 here.
  const hasItems = Number.isFinite(options.total) && Math.floor(options.total) >= 1;
  const meta = useMemo(
    () =>
      getPaginationMeta({
        page: hasItems ? state.page : 1,
        pageSize: state.pageSize,
        total: options.total,
      }),
    [state.page, state.pageSize, options.total, hasItems],
  );
  // At least 1, so navigation on an empty dataset never stores a page > 1.
  const maxPage = Math.max(meta.totalPages, 1);
  const { totalPages } = meta;

  const setPage = useCallback(
    (page: number) => {
      setState((current) => ({
        ...current,
        page: normalizePage(page, maxPage),
      }));
    },
    [maxPage],
  );

  const nextPage = useCallback(() => {
    setState((current) => ({
      ...current,
      page: normalizePage(meta.page + 1, maxPage),
    }));
  }, [meta.page, maxPage]);

  const previousPage = useCallback(() => {
    setState((current) => ({
      ...current,
      page: normalizePage(meta.page - 1, maxPage),
    }));
  }, [meta.page, maxPage]);

  const firstPage = useCallback(() => {
    setState((current) => ({ ...current, page: 1 }));
  }, []);

  const lastPage = useCallback(() => {
    setState((current) => ({
      ...current,
      page: normalizePage(maxPage, maxPage),
    }));
  }, [maxPage]);

  const setPageSize = useCallback(
    (pageSize: number) => {
      const nextSize = normalizePageSize(pageSize);
      setState({
        pageSize: nextSize,
        page: Math.floor(meta.startIndex / nextSize) + 1,
      });
    },
    [meta.startIndex],
  );

  const reset = useCallback(() => {
    setState({ page: initialPage, pageSize: initialPageSize });
  }, [initialPage, initialPageSize]);

  const paginateItems = useCallback(
    <T,>(items: readonly T[]): T[] => items.slice(meta.startIndex, meta.endIndex),
    [meta.startIndex, meta.endIndex],
  );

  return useMemo(
    () => ({
      page: meta.page,
      pageSize: meta.pageSize,
      totalPages,
      meta,
      setPage,
      nextPage,
      previousPage,
      firstPage,
      lastPage,
      setPageSize,
      reset,
      paginateItems,
    }),
    [
      meta,
      totalPages,
      setPage,
      nextPage,
      previousPage,
      firstPage,
      lastPage,
      setPageSize,
      reset,
      paginateItems,
    ],
  );
}
