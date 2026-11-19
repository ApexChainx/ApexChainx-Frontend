/** ApexChain Network Operations Intelligence Platform */
/**
 * Sort state hook (Issue #975).
 *
 * Holds which field a table is sorted by and in which direction, and the
 * toggling behaviour of a sortable column header. It does not sort anything
 * itself: pair `sort` with `sortBy` / the comparators in `../utils/sort`.
 *
 * Toggling a header follows the usual cycle. Selecting a new field sorts it in
 * `defaultDirection`; selecting the same field again flips the direction; with
 * `allowClear` a third selection clears the sort instead of returning to the
 * default direction.
 */
import { useCallback, useMemo, useState } from "react";

import type { SortDirection } from "../utils/sort";

/** Current sort. `field` is `null` when the data is unsorted. */
export interface SortState<TField extends string> {
  field: TField | null;
  direction: SortDirection;
}

export interface UseSortStateOptions<TField extends string> {
  /** Field sorted on first render. Defaults to unsorted. */
  initialField?: TField | null | undefined;
  /** Direction used with `initialField`. Defaults to `defaultDirection`. */
  initialDirection?: SortDirection | undefined;
  /** Direction applied when a field is first selected. Defaults to "asc". */
  defaultDirection?: SortDirection | undefined;
  /** Let a third toggle of the same field clear the sort. Defaults to false. */
  allowClear?: boolean | undefined;
}

/** Value of the `aria-sort` attribute for a column header. */
export type AriaSort = "ascending" | "descending" | "none";

export interface UseSortStateResult<TField extends string> {
  sort: SortState<TField>;
  field: TField | null;
  direction: SortDirection;
  /** Sort by `field`; `direction` defaults to the configured default direction. */
  setSort: (field: TField | null, direction?: SortDirection) => void;
  /** Header click behaviour: select, flip, and optionally clear. */
  toggleSort: (field: TField) => void;
  /** Return to the initial sort. */
  resetSort: () => void;
  /** Remove the sort entirely, whatever the initial sort was. */
  clearSort: () => void;
  isSortedBy: (field: TField) => boolean;
  /** `aria-sort` value for a column header. */
  getAriaSort: (field: TField) => AriaSort;
}

function opposite(direction: SortDirection): SortDirection {
  return direction === "asc" ? "desc" : "asc";
}

/**
 * Pure transition behind `toggleSort`, exported so the cycle can be reused
 * (for example with URL state) and tested without rendering.
 */
export function toggleSortState<TField extends string>(
  current: SortState<TField>,
  field: TField,
  options: Pick<UseSortStateOptions<TField>, "defaultDirection" | "allowClear"> = {},
): SortState<TField> {
  const defaultDirection = options.defaultDirection ?? "asc";
  if (current.field !== field) {
    return { field, direction: defaultDirection };
  }
  if (current.direction === defaultDirection) {
    return { field, direction: opposite(defaultDirection) };
  }
  return options.allowClear
    ? { field: null, direction: defaultDirection }
    : { field, direction: defaultDirection };
}

export function useSortState<TField extends string>(
  options: UseSortStateOptions<TField> = {},
): UseSortStateResult<TField> {
  const {
    initialField = null,
    defaultDirection = "asc",
    allowClear = false,
  } = options;
  const initialDirection = options.initialDirection ?? defaultDirection;

  const [sort, setSortState] = useState<SortState<TField>>({
    field: initialField,
    direction: initialDirection,
  });

  const setSort = useCallback(
    (field: TField | null, direction?: SortDirection) => {
      setSortState({ field, direction: direction ?? defaultDirection });
    },
    [defaultDirection],
  );

  const toggleSort = useCallback(
    (field: TField) => {
      setSortState((current) =>
        toggleSortState(current, field, { defaultDirection, allowClear }),
      );
    },
    [defaultDirection, allowClear],
  );

  const resetSort = useCallback(() => {
    setSortState({ field: initialField, direction: initialDirection });
  }, [initialField, initialDirection]);

  const clearSort = useCallback(() => {
    setSortState({ field: null, direction: defaultDirection });
  }, [defaultDirection]);

  const isSortedBy = useCallback(
    (field: TField) => sort.field === field,
    [sort.field],
  );

  const getAriaSort = useCallback(
    (field: TField): AriaSort => {
      if (sort.field !== field) {
        return "none";
      }
      return sort.direction === "asc" ? "ascending" : "descending";
    },
    [sort.field, sort.direction],
  );

  return useMemo(
    () => ({
      sort,
      field: sort.field,
      direction: sort.direction,
      setSort,
      toggleSort,
      resetSort,
      clearSort,
      isSortedBy,
      getAriaSort,
    }),
    [sort, setSort, toggleSort, resetSort, clearSort, isSortedBy, getAriaSort],
  );
}
