/** ApexChain Network Operations Intelligence Platform */
import { describe, it, expect } from "vitest";
import {
  parseOutagesFilter,
  serializeOutagesFilter,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MIN_PAGE,
} from "@/lib/urlState";

function makeParams(entries: Record<string, string>): URLSearchParams {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(entries)) p.set(k, v);
  return p;
}

describe("parseOutagesFilter", () => {
  it("uses defaults when no params are present", () => {
    const filter = parseOutagesFilter(new URLSearchParams());
    expect(filter.page).toBe(MIN_PAGE);
    expect(filter.page_size).toBe(DEFAULT_PAGE_SIZE);
    expect(filter.sort_order).toBe("desc");
  });

  it("parses valid numeric params", () => {
    const filter = parseOutagesFilter(makeParams({ page: "3", page_size: "25" }));
    expect(filter.page).toBe(3);
    expect(filter.page_size).toBe(25);
  });

  it.each([
    ["abc", MIN_PAGE],
    ["0", MIN_PAGE],
    ["-5", MIN_PAGE],
    ["1.5", MIN_PAGE],
    ["", MIN_PAGE],
  ])("clamps malformed page %s to %s", (raw, expected) => {
    const filter = parseOutagesFilter(makeParams({ page: raw }));
    expect(filter.page).toBe(expected);
  });

  it.each([
    ["abc", DEFAULT_PAGE_SIZE],
    ["0", DEFAULT_PAGE_SIZE],
    ["-1", DEFAULT_PAGE_SIZE],
    ["1.5", 1],
    ["", DEFAULT_PAGE_SIZE],
    [String(MAX_PAGE_SIZE + 10), MAX_PAGE_SIZE],
    ["999999", MAX_PAGE_SIZE],
  ])("clamps malformed page_size %s to %s", (raw, expected) => {
    const filter = parseOutagesFilter(makeParams({ page_size: raw }));
    expect(filter.page_size).toBe(expected);
  });

  it("keeps valid page_size within bounds", () => {
    const filter = parseOutagesFilter(makeParams({ page_size: "50" }));
    expect(filter.page_size).toBe(50);
  });

  it("rounds fractional page down", () => {
    const filter = parseOutagesFilter(makeParams({ page: "2.9" }));
    expect(filter.page).toBe(2);
  });
});

describe("serializeOutagesFilter", () => {
  it("normalizes NaN and out-of-range values on serialization", () => {
    const params = serializeOutagesFilter({ page: Number.NaN, page_size: 999999 });
    expect(params.get("page")).toBe(String(MIN_PAGE));
    expect(params.get("page_size")).toBe(String(MAX_PAGE_SIZE));
  });

  it("omits optional undefined fields", () => {
    const params = serializeOutagesFilter({ page: 2, page_size: 20 });
    expect(params.has("severity")).toBe(false);
    expect(params.has("sort_field")).toBe(false);
  });
});

describe("round trip", () => {
  it.each([
    [{ page: "2", page_size: "50", severity: "high" }],
    [{ page: "1", page_size: "10", status: "ongoing" }],
    [{ page: "5", page_size: "99", search: "core" }],
  ])("parsing then serializing is stable for %o", (input) => {
    const params = makeParams(input);
    const filter = parseOutagesFilter(params);
    const serialized = serializeOutagesFilter(filter);
    for (const [k, v] of Object.entries(input)) {
      expect(serialized.get(k)).toBe(v);
    }
  });

  it("is stable for malformed input (falls back to defaults)", () => {
    const filter = parseOutagesFilter(makeParams({ page: "abc", page_size: "0" }));
    const serialized = serializeOutagesFilter(filter);
    expect(serialized.get("page")).toBe(String(MIN_PAGE));
    expect(serialized.get("page_size")).toBe(String(DEFAULT_PAGE_SIZE));
  });
});
