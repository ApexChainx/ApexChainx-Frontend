/** ApexChain Frontend Test Suite */
/** Issue #924 — query state parse/serialize round-trips. */
import { describe, expect, it } from "vitest";

import {
  EMPTY_QUERY_STATE,
  mergeQueryState,
  parseQueryState,
  serializeQueryState,
} from "@/features/sla-operations/utils/query-state";

describe("query state utilities (#924)", () => {
  it("parses a full query string", () => {
    const state = parseQueryState(
      "?search=lagos&statuses=open,mitigating&severities=high&from=2026-01-01&to=2026-01-31&sortField=detected_at&sortDir=desc&page=2",
    );
    expect(state.search).toBe("lagos");
    expect(state.statuses).toEqual(["open", "mitigating"]);
    expect(state.severities).toEqual(["high"]);
    expect(state.from).toBe("2026-01-01");
    expect(state.to).toBe("2026-01-31");
    expect(state.sortField).toBe("detected_at");
    expect(state.sortDir).toBe("desc");
    expect(state.page).toBe(2);
  });

  it("handles empty and malformed input safely", () => {
    expect(parseQueryState(null)).toEqual(EMPTY_QUERY_STATE);
    expect(parseQueryState("page=abc&sortDir=sideways").page).toBeUndefined();
    expect(parseQueryState("page=abc&sortDir=sideways").sortDir).toBeUndefined();
    expect(parseQueryState("statuses=open,,high,").statuses).toEqual([
      "open",
      "high",
    ]);
  });

  it("round-trips through serialize and parse", () => {
    const state = {
      search: "outage",
      statuses: ["open"],
      severities: ["high", "critical"],
      page: 3,
    };
    const query = serializeQueryState(state);
    expect(parseQueryState(query)).toEqual({
      ...EMPTY_QUERY_STATE,
      ...state,
    });
  });

  it("merges partial updates over a base state", () => {
    expect(
      mergeQueryState(EMPTY_QUERY_STATE, { search: "lagos", page: 2 }),
    ).toEqual({ ...EMPTY_QUERY_STATE, search: "lagos", page: 2 });
  });
});
