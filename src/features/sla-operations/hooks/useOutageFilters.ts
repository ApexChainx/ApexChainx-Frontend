/** ApexChain Network Operations Intelligence Platform */
/**
 * Outage filter state hook (Issue #963).
 *
 * Holds the filter state of an outage operations view and derives what the
 * view needs from it: a count of active filters, query-ready parameters for
 * the API or URL, and a predicate for filtering rows on the client.
 *
 * Every input is normalised on the way in (`normalizeOutageFilters`), so the
 * state never holds blank search text, duplicate or unknown severities and
 * statuses, malformed dates or an inverted date range.
 */
import { useCallback, useMemo, useState } from "react";

import type {
  OutageFilterState,
  OutageRow,
  OutageSeverity,
  OutageStatus,
} from "../types/outage-operations";
import { clampDateRange, parseDateRange } from "../utils/date-range";
import { allOf, matchesAny, matchesText, type Predicate } from "../utils/filter";
import { normalizeSeverity } from "../utils/severity";

/** Statuses an outage can have, in lifecycle order. */
export const OUTAGE_STATUSES: readonly OutageStatus[] = [
  "open",
  "investigating",
  "mitigating",
  "resolved",
];

/** The subset of an outage row the filters look at. */
export type FilterableOutage = Pick<
  OutageRow,
  "id" | "siteId" | "siteName" | "severity" | "status" | "detectedAt" | "assignedTo"
>;

/** Query parameters with empty filters left out. Lists are comma-separated. */
export type OutageQueryParams = Record<string, string>;

export interface UseOutageFiltersOptions {
  initialFilters?: Partial<OutageFilterState> | undefined;
}

export interface UseOutageFiltersResult {
  filters: OutageFilterState;
  /** Merge a partial update into the filters (normalised). */
  setFilters: (update: Partial<OutageFilterState>) => void;
  setSearch: (search: string | undefined) => void;
  setSeverities: (severities: readonly string[]) => void;
  toggleSeverity: (severity: string) => void;
  setStatuses: (statuses: readonly string[]) => void;
  toggleStatus: (status: string) => void;
  /** Set both bounds at once (ISO date strings); pass `null` or `undefined` to open a bound. */
  setDateRange: (range: { from?: string | null | undefined; to?: string | null | undefined }) => void;
  setAssignedTo: (assignedTo: string | undefined) => void;
  /** Remove every filter. */
  clearFilters: () => void;
  /** Return to the initial filters. */
  resetFilters: () => void;
  /** Number of filter groups that are set (search, severity, status, date range, assignee). */
  activeFilterCount: number;
  hasActiveFilters: boolean;
  queryParams: OutageQueryParams;
  /** Whether an outage passes the current filters. */
  matches: Predicate<FilterableOutage>;
  /** Rows that pass the current filters; the input is not mutated. */
  filterOutages: <T extends FilterableOutage>(rows: readonly T[] | null | undefined) => T[];
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function cleanText(value: string | null | undefined): string | undefined {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed === "" ? undefined : trimmed;
}

/** Normalise filter input: trim text, drop unknown/duplicate selections, fix dates. */
export function normalizeOutageFilters(
  input: Partial<OutageFilterState> | null | undefined = {},
): OutageFilterState {
  const source = input ?? {};
  const severities = unique(
    (source.severities ?? [])
      .map((value) => normalizeSeverity(value))
      .filter((value): value is OutageSeverity => value !== null),
  );
  const statuses = unique(
    (source.statuses ?? [])
      .map((value) => String(value).trim().toLowerCase())
      .filter((value): value is OutageStatus =>
        (OUTAGE_STATUSES as readonly string[]).includes(value),
      ),
  );
  const range = clampDateRange(
    parseDateRange({ from: source.from, to: source.to }),
    { from: null, to: null },
  );
  const search = cleanText(source.search);
  const assignedTo = cleanText(source.assignedTo);

  return {
    severities,
    statuses,
    ...(search !== undefined ? { search } : {}),
    ...(range.from !== null ? { from: range.from } : {}),
    ...(range.to !== null ? { to: range.to } : {}),
    ...(assignedTo !== undefined ? { assignedTo } : {}),
  };
}

/** Number of filter groups that are set. */
export function countActiveOutageFilters(filters: OutageFilterState): number {
  return [
    filters.search !== undefined,
    filters.severities.length > 0,
    filters.statuses.length > 0,
    filters.from !== undefined || filters.to !== undefined,
    filters.assignedTo !== undefined,
  ].filter(Boolean).length;
}

/** Query parameters for the current filters, with empty ones omitted. */
export function toOutageQueryParams(filters: OutageFilterState): OutageQueryParams {
  const params: OutageQueryParams = {};
  if (filters.search !== undefined) params.search = filters.search;
  if (filters.severities.length > 0) params.severity = filters.severities.join(",");
  if (filters.statuses.length > 0) params.status = filters.statuses.join(",");
  if (filters.from !== undefined) params.from = filters.from;
  if (filters.to !== undefined) params.to = filters.to;
  if (filters.assignedTo !== undefined) params.assigned_to = filters.assignedTo;
  return params;
}

/** Predicate for the date part of an ISO timestamp, inclusive of both bounds (UTC dates). */
function detectedWithin(from: string | undefined, to: string | undefined): Predicate<FilterableOutage> {
  return (outage) => {
    if (from === undefined && to === undefined) {
      return true;
    }
    const time = new Date(outage.detectedAt).getTime();
    if (Number.isNaN(time)) {
      return false;
    }
    const day = new Date(time).toISOString().slice(0, 10);
    return (from === undefined || day >= from) && (to === undefined || day <= to);
  };
}

/** Build the client-side predicate for a set of filters. */
export function createOutagePredicate(filters: OutageFilterState): Predicate<FilterableOutage> {
  const assignee = filters.assignedTo?.toLowerCase();
  return allOf<FilterableOutage>(
    matchesText(filters.search, (outage) => [
      outage.id,
      outage.siteName,
      outage.siteId,
      outage.assignedTo,
    ]),
    matchesAny<FilterableOutage, string>(
      filters.severities,
      (outage) => normalizeSeverity(outage.severity) ?? outage.severity,
    ),
    matchesAny<FilterableOutage, string>(filters.statuses, (outage) => outage.status),
    detectedWithin(filters.from, filters.to),
    (outage) => assignee === undefined || outage.assignedTo?.trim().toLowerCase() === assignee,
  );
}

export function useOutageFilters(
  options: UseOutageFiltersOptions = {},
): UseOutageFiltersResult {
  const { initialFilters } = options;
  const [initial] = useState(() => normalizeOutageFilters(initialFilters));
  const [filters, setFiltersState] = useState<OutageFilterState>(initial);

  const setFilters = useCallback((update: Partial<OutageFilterState>) => {
    setFiltersState((current) => normalizeOutageFilters({ ...current, ...update }));
  }, []);

  const setSearch = useCallback((search: string | undefined) => {
    setFiltersState((current) => normalizeOutageFilters({ ...current, search }));
  }, []);

  const setSeverities = useCallback((severities: readonly string[]) => {
    setFiltersState((current) =>
      normalizeOutageFilters({ ...current, severities: severities as OutageSeverity[] }),
    );
  }, []);

  const toggleSeverity = useCallback((severity: string) => {
    const normalized = normalizeSeverity(severity);
    if (normalized === null) {
      return;
    }
    setFiltersState((current) =>
      normalizeOutageFilters({
        ...current,
        severities: current.severities.includes(normalized)
          ? current.severities.filter((value) => value !== normalized)
          : [...current.severities, normalized],
      }),
    );
  }, []);

  const setStatuses = useCallback((statuses: readonly string[]) => {
    setFiltersState((current) =>
      normalizeOutageFilters({ ...current, statuses: statuses as OutageStatus[] }),
    );
  }, []);

  const toggleStatus = useCallback((status: string) => {
    const normalized = status.trim().toLowerCase() as OutageStatus;
    if (!OUTAGE_STATUSES.includes(normalized)) {
      return;
    }
    setFiltersState((current) =>
      normalizeOutageFilters({
        ...current,
        statuses: current.statuses.includes(normalized)
          ? current.statuses.filter((value) => value !== normalized)
          : [...current.statuses, normalized],
      }),
    );
  }, []);

  const setDateRange = useCallback(
    (range: { from?: string | null | undefined; to?: string | null | undefined }) => {
      setFiltersState((current) =>
        normalizeOutageFilters({
          ...current,
          from: range.from ?? undefined,
          to: range.to ?? undefined,
        }),
      );
    },
    [],
  );

  const setAssignedTo = useCallback((assignedTo: string | undefined) => {
    setFiltersState((current) => normalizeOutageFilters({ ...current, assignedTo }));
  }, []);

  const clearFilters = useCallback(() => setFiltersState(normalizeOutageFilters({})), []);
  const resetFilters = useCallback(() => setFiltersState(initial), [initial]);

  const activeFilterCount = useMemo(() => countActiveOutageFilters(filters), [filters]);
  const queryParams = useMemo(() => toOutageQueryParams(filters), [filters]);
  const matches = useMemo(() => createOutagePredicate(filters), [filters]);
  const filterOutages = useCallback(
    <T extends FilterableOutage>(rows: readonly T[] | null | undefined): T[] =>
      rows ? rows.filter(matches) : [],
    [matches],
  );

  return useMemo(
    () => ({
      filters,
      setFilters,
      setSearch,
      setSeverities,
      toggleSeverity,
      setStatuses,
      toggleStatus,
      setDateRange,
      setAssignedTo,
      clearFilters,
      resetFilters,
      activeFilterCount,
      hasActiveFilters: activeFilterCount > 0,
      queryParams,
      matches,
      filterOutages,
    }),
    [
      filters,
      setFilters,
      setSearch,
      setSeverities,
      toggleSeverity,
      setStatuses,
      toggleStatus,
      setDateRange,
      setAssignedTo,
      clearFilters,
      resetFilters,
      activeFilterCount,
      queryParams,
      matches,
      filterOutages,
    ],
  );
}
