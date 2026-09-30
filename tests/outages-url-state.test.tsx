/** ApexChain Network Operations Intelligence Platform */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { router, searchParamsRef } = vi.hoisted(() => ({
  router: { push: vi.fn(), replace: vi.fn(), back: vi.fn() },
  searchParamsRef: { current: new URLSearchParams() },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => searchParamsRef.current,
}));

import { useOutagesTableState } from "@/hooks/useOutagesTableState";
import { parseOutagesFilter } from "@/lib/urlState";

/** The query string handed to the most recent push/replace navigation. */
function queryFrom(mock: typeof router.push): URLSearchParams {
  const href = mock.mock.calls.at(-1)?.[0];
  expect(typeof href).toBe("string");
  return new URLSearchParams(String(href).replace(/^\?/, ""));
}

beforeEach(() => {
  router.push.mockReset();
  router.replace.mockReset();
  router.back.mockReset();
  searchParamsRef.current = new URLSearchParams();
});

describe("useOutagesTableState (issue #638)", () => {
  it("derives its state from the URL on the first render", () => {
    searchParamsRef.current = new URLSearchParams(
      "search=lagos&sort_field=title&sort_order=asc&page=3&severity=high",
    );

    const { result } = renderHook(() => useOutagesTableState());

    expect(result.current.state).toMatchObject({
      search: "lagos",
      sort_field: "title",
      sort_order: "asc",
      page: 3,
      severity: "high",
    });
  });

  it("does not rewrite the URL on mount (restored filters must not refetch)", () => {
    searchParamsRef.current = new URLSearchParams("search=lagos&page=2");

    renderHook(() => useOutagesTableState());

    expect(router.push).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("persists the search term with replace so typing does not spam history", () => {
    const { result } = renderHook(() => useOutagesTableState());

    act(() => result.current.actions.setSearch("core"));

    expect(router.push).not.toHaveBeenCalled();
    const query = queryFrom(router.replace);
    expect(query.get("search")).toBe("core");
    expect(query.get("page")).toBe("1");
  });

  it("drops the search parameter when the term is cleared", () => {
    searchParamsRef.current = new URLSearchParams("search=core");

    const { result } = renderHook(() => useOutagesTableState());
    act(() => result.current.actions.setSearch(""));

    expect(queryFrom(router.replace).has("search")).toBe(false);
  });

  it("persists the sort selection and resets the page", () => {
    const { result } = renderHook(() => useOutagesTableState());

    act(() => result.current.actions.setSort("title", "asc"));

    const query = queryFrom(router.push);
    expect(query.get("sort_field")).toBe("title");
    expect(query.get("sort_order")).toBe("asc");
    expect(query.get("page")).toBe("1");
  });

  it("clears the sort selection", () => {
    searchParamsRef.current = new URLSearchParams(
      "sort_field=title&sort_order=asc&page=2",
    );

    const { result } = renderHook(() => useOutagesTableState());
    act(() => result.current.actions.clearSort());

    const query = queryFrom(router.push);
    expect(query.has("sort_field")).toBe(false);
    expect(query.has("sort_order")).toBe(false);
    expect(query.get("page")).toBe("1");
  });

  it("keeps unrelated parameters when one filter changes", () => {
    searchParamsRef.current = new URLSearchParams("severity=high&page=4");

    const { result } = renderHook(() => useOutagesTableState());
    act(() => result.current.actions.setStatus("open"));

    const query = queryFrom(router.push);
    expect(query.get("severity")).toBe("high");
    expect(query.get("status")).toBe("open");
  });

  describe("URL round-trip", () => {
    it("round-trips the search term through parseOutagesFilter", () => {
      const { result } = renderHook(() => useOutagesTableState());

      act(() => result.current.actions.setSearch("core switch"));
      const filter = parseOutagesFilter(queryFrom(router.replace));

      expect(filter.search).toBe("core switch");
      expect(filter.page).toBe(1);
    });

    it("round-trips the sort pair through parseOutagesFilter", () => {
      const { result } = renderHook(() => useOutagesTableState());

      act(() => result.current.actions.setSort("detected_at", "asc"));
      const filter = parseOutagesFilter(queryFrom(router.push));

      expect(filter.sort_field).toBe("detected_at");
      expect(filter.sort_order).toBe("asc");
    });
  });
});
