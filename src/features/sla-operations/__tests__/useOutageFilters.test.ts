/** ApexChain Frontend Test Suite */
/** Issue #963 — outage filter state, query params and client filtering. */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  countActiveOutageFilters,
  createOutagePredicate,
  normalizeOutageFilters,
  toOutageQueryParams,
  useOutageFilters,
  type FilterableOutage,
} from "@/features/sla-operations/hooks/useOutageFilters";

function outage(overrides: Partial<FilterableOutage> & { id: string }): FilterableOutage {
  return {
    siteId: "site-1",
    siteName: "Lagos Central",
    severity: "high",
    status: "open",
    detectedAt: "2026-05-10T12:00:00Z",
    assignedTo: null,
    ...overrides,
  };
}

const rows: FilterableOutage[] = [
  outage({ id: "o1" }),
  outage({
    id: "o2",
    siteId: "site-2",
    siteName: "Abuja North",
    severity: "low",
    status: "resolved",
    detectedAt: "2026-05-02T08:00:00Z",
    assignedTo: "Ada Obi",
  }),
  outage({
    id: "o3",
    siteName: "Lagos Island",
    severity: "critical",
    status: "investigating",
    detectedAt: "2026-04-28T23:30:00Z",
    assignedTo: "ada obi",
  }),
];

describe("normalizeOutageFilters (#963)", () => {
  it("returns empty filters for no input", () => {
    expect(normalizeOutageFilters()).toEqual({ severities: [], statuses: [] });
    expect(normalizeOutageFilters(null)).toEqual({ severities: [], statuses: [] });
  });

  it("trims text and drops blanks", () => {
    expect(normalizeOutageFilters({ search: "  lagos ", assignedTo: " Ada " })).toEqual({
      severities: [],
      statuses: [],
      search: "lagos",
      assignedTo: "Ada",
    });
    expect(normalizeOutageFilters({ search: "   ", assignedTo: "" })).toEqual({
      severities: [],
      statuses: [],
    });
  });

  it("normalises, de-duplicates and drops unknown severities and statuses", () => {
    const result = normalizeOutageFilters({
      severities: ["URGENT", "critical", "high", "bogus"] as never,
      statuses: ["Open", "open", "closed", "resolved"] as never,
    });
    expect(result.severities).toEqual(["critical", "high"]);
    expect(result.statuses).toEqual(["open", "resolved"]);
  });

  it("normalises dates and fixes an inverted range", () => {
    expect(normalizeOutageFilters({ from: "2026-05-10T10:00:00Z", to: "2026-05-12" })).toMatchObject({
      from: "2026-05-10",
      to: "2026-05-12",
    });
    expect(normalizeOutageFilters({ from: "2026-05-12", to: "2026-05-10" })).toMatchObject({
      from: "2026-05-12",
      to: "2026-05-12",
    });
    const invalid = normalizeOutageFilters({ from: "not-a-date" });
    expect(invalid.from).toBeUndefined();
  });
});

describe("query params and counts (#963)", () => {
  it("omits empty filters", () => {
    expect(toOutageQueryParams(normalizeOutageFilters())).toEqual({});
  });

  it("serialises every filter, joining lists with commas", () => {
    const filters = normalizeOutageFilters({
      search: "lagos",
      severities: ["high", "critical"],
      statuses: ["open"],
      from: "2026-05-01",
      to: "2026-05-31",
      assignedTo: "Ada",
    });
    expect(toOutageQueryParams(filters)).toEqual({
      search: "lagos",
      severity: "high,critical",
      status: "open",
      from: "2026-05-01",
      to: "2026-05-31",
      assigned_to: "Ada",
    });
    expect(countActiveOutageFilters(filters)).toBe(5);
  });

  it("counts a date range as one filter", () => {
    expect(countActiveOutageFilters(normalizeOutageFilters({ from: "2026-05-01" }))).toBe(1);
    expect(
      countActiveOutageFilters(normalizeOutageFilters({ from: "2026-05-01", to: "2026-05-02" })),
    ).toBe(1);
  });
});

describe("useOutageFilters (#963)", () => {
  it("starts empty by default and from normalised initial filters", () => {
    const empty = renderHook(() => useOutageFilters());
    expect(empty.result.current.hasActiveFilters).toBe(false);
    expect(empty.result.current.queryParams).toEqual({});

    const seeded = renderHook(() =>
      useOutageFilters({ initialFilters: { search: " lagos ", severities: ["high"] } }),
    );
    expect(seeded.result.current.filters.search).toBe("lagos");
    expect(seeded.result.current.activeFilterCount).toBe(2);
  });

  it("updates search, assignee and date range, and clears them with empty values", () => {
    const { result } = renderHook(() => useOutageFilters());

    act(() => result.current.setSearch("  abuja "));
    act(() => result.current.setAssignedTo("Ada"));
    act(() => result.current.setDateRange({ from: "2026-05-01", to: "2026-05-31" }));
    expect(result.current.queryParams).toEqual({
      search: "abuja",
      assigned_to: "Ada",
      from: "2026-05-01",
      to: "2026-05-31",
    });

    act(() => result.current.setSearch(undefined));
    act(() => result.current.setAssignedTo(undefined));
    act(() => result.current.setDateRange({ from: null, to: undefined }));
    expect(result.current.hasActiveFilters).toBe(false);
  });

  it("toggles severities and statuses, ignoring unknown values", () => {
    const { result } = renderHook(() => useOutageFilters());

    act(() => result.current.toggleSeverity("High"));
    act(() => result.current.toggleSeverity("urgent"));
    act(() => result.current.toggleSeverity("nonsense"));
    expect(result.current.filters.severities).toEqual(["high", "critical"]);
    act(() => result.current.toggleSeverity("high"));
    expect(result.current.filters.severities).toEqual(["critical"]);

    act(() => result.current.toggleStatus("OPEN"));
    act(() => result.current.toggleStatus("closed"));
    expect(result.current.filters.statuses).toEqual(["open"]);
    act(() => result.current.toggleStatus("open"));
    expect(result.current.filters.statuses).toEqual([]);
  });

  it("setSeverities and setStatuses replace the selection", () => {
    const { result } = renderHook(() => useOutageFilters());
    act(() => result.current.setSeverities(["low", "minor", "bogus"]));
    expect(result.current.filters.severities).toEqual(["low"]);
    act(() => result.current.setStatuses(["open", "resolved"]));
    expect(result.current.filters.statuses).toEqual(["open", "resolved"]);
  });

  it("setFilters merges a partial update", () => {
    const { result } = renderHook(() =>
      useOutageFilters({ initialFilters: { search: "lagos" } }),
    );
    act(() => result.current.setFilters({ statuses: ["open"] }));
    expect(result.current.filters).toMatchObject({ search: "lagos", statuses: ["open"] });
  });

  it("clearFilters empties everything and resetFilters restores the initial state", () => {
    const { result } = renderHook(() =>
      useOutageFilters({ initialFilters: { severities: ["high"], search: "lagos" } }),
    );
    act(() => result.current.toggleStatus("open"));

    act(() => result.current.clearFilters());
    expect(result.current.hasActiveFilters).toBe(false);

    act(() => result.current.resetFilters());
    expect(result.current.filters).toEqual({ severities: ["high"], statuses: [], search: "lagos" });
  });

  it("filters rows by text across id, site and assignee", () => {
    const { result } = renderHook(() => useOutageFilters());
    act(() => result.current.setSearch("lagos"));
    expect(result.current.filterOutages(rows).map((row) => row.id)).toEqual(["o1", "o3"]);

    act(() => result.current.setSearch("ADA"));
    expect(result.current.filterOutages(rows).map((row) => row.id)).toEqual(["o2", "o3"]);
  });

  it("filters rows by severity (including aliases), status and assignee", () => {
    const { result } = renderHook(() => useOutageFilters());

    act(() => result.current.setSeverities(["critical", "low"]));
    expect(result.current.filterOutages(rows).map((row) => row.id)).toEqual(["o2", "o3"]);

    act(() => result.current.setStatuses(["resolved"]));
    expect(result.current.filterOutages(rows).map((row) => row.id)).toEqual(["o2"]);

    act(() => result.current.clearFilters());
    act(() => result.current.setAssignedTo("ADA OBI"));
    expect(result.current.filterOutages(rows).map((row) => row.id)).toEqual(["o2", "o3"]);
  });

  it("filters rows by an inclusive UTC date range", () => {
    const { result } = renderHook(() => useOutageFilters());

    act(() => result.current.setDateRange({ from: "2026-05-02", to: "2026-05-10" }));
    expect(result.current.filterOutages(rows).map((row) => row.id)).toEqual(["o1", "o2"]);

    act(() => result.current.setDateRange({ to: "2026-04-28" }));
    expect(result.current.filterOutages(rows).map((row) => row.id)).toEqual(["o3"]);

    act(() => result.current.setDateRange({ from: "2026-05-11" }));
    expect(result.current.filterOutages(rows)).toEqual([]);
  });

  it("excludes rows with an unreadable date when a date bound is set", () => {
    const { result } = renderHook(() => useOutageFilters());
    act(() => result.current.setDateRange({ from: "2026-05-01" }));
    expect(
      result.current.filterOutages([outage({ id: "bad", detectedAt: "yesterday-ish" })]),
    ).toEqual([]);
  });

  it("returns every row with no filters and handles missing input", () => {
    const { result } = renderHook(() => useOutageFilters());
    expect(result.current.filterOutages(rows)).toHaveLength(3);
    expect(result.current.filterOutages(null)).toEqual([]);
    expect(result.current.filterOutages(undefined)).toEqual([]);
  });

  it("keeps the same result object until the filters change", () => {
    const { result, rerender } = renderHook(() => useOutageFilters());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
    act(() => result.current.setSearch("x"));
    expect(result.current).not.toBe(first);
  });

  it("normalises an inverted date range set through the hook", () => {
    const { result } = renderHook(() => useOutageFilters());

    act(() => result.current.setDateRange({ from: "2026-05-12", to: "2026-05-10" }));
    expect(result.current.queryParams).toEqual({ from: "2026-05-12", to: "2026-05-12" });
    expect(result.current.filterOutages(rows).map((row) => row.id)).toEqual([]);
  });

  it("does not mutate the rows it filters", () => {
    const { result } = renderHook(() => useOutageFilters({ initialFilters: { search: "lagos" } }));
    const input = [...rows];
    result.current.filterOutages(input);
    expect(input.map((row) => row.id)).toEqual(["o1", "o2", "o3"]);
  });
});

describe("createOutagePredicate (#963)", () => {
  it("accepts every row when no filter is set", () => {
    const predicate = createOutagePredicate(normalizeOutageFilters());
    expect(rows.every(predicate)).toBe(true);
  });

  it("requires a row to satisfy every active filter", () => {
    const predicate = createOutagePredicate(
      normalizeOutageFilters({
        search: "lagos",
        severities: ["critical"],
        statuses: ["investigating"],
        from: "2026-04-01",
        to: "2026-04-30",
      }),
    );
    expect(rows.filter(predicate).map((row) => row.id)).toEqual(["o3"]);
  });

  it("matches a row severity through its backend alias", () => {
    const predicate = createOutagePredicate(normalizeOutageFilters({ severities: ["critical"] }));
    expect(predicate(outage({ id: "alias", severity: "urgent" as never }))).toBe(true);
    expect(predicate(outage({ id: "alias", severity: "sev-9" as never }))).toBe(false);
  });

  it("treats the date bounds as inclusive UTC days", () => {
    const predicate = createOutagePredicate(
      normalizeOutageFilters({ from: "2026-04-28", to: "2026-04-28" }),
    );
    expect(predicate(outage({ id: "edge", detectedAt: "2026-04-28T23:59:59Z" }))).toBe(true);
    expect(predicate(outage({ id: "edge", detectedAt: "2026-04-29T00:00:00Z" }))).toBe(false);
  });

  it("ignores an unreadable date when no bound is set", () => {
    const predicate = createOutagePredicate(normalizeOutageFilters());
    expect(predicate(outage({ id: "bad", detectedAt: "yesterday-ish" }))).toBe(true);
  });

  it("matches the assignee case-insensitively and only on exact names", () => {
    const predicate = createOutagePredicate(normalizeOutageFilters({ assignedTo: "ada obi" }));
    expect(predicate(outage({ id: "a", assignedTo: "  ADA OBI " }))).toBe(true);
    expect(predicate(outage({ id: "b", assignedTo: "Ada" }))).toBe(false);
    expect(predicate(outage({ id: "c", assignedTo: null }))).toBe(false);
  });
});
