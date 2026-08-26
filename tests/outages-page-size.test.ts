/** ApexChain Frontend Test Suite */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGet = vi.fn();
vi.mock("@/lib/api", () => ({
  api: { get: (...args: unknown[]) => mockGet(...args) },
}));

import { fetchOutages } from "@/lib/outages";
import { getOutages } from "@/services/outages";
import {
  DEFAULT_OUTAGES_PAGE_SIZE,
  parseOutagesFilter,
} from "@/lib/urlState";

const paginated = { items: [], page: 1, page_size: 10, total: 0 };

describe("outages page-size defaults", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockGet.mockResolvedValue({ data: paginated });
  });

  it("exports the canonical default page size as 10", () => {
    expect(DEFAULT_OUTAGES_PAGE_SIZE).toBe(10);
  });

  it("fetchOutages defaults page_size to the shared constant", async () => {
    await fetchOutages({ page: 1 });
    const [, config] = mockGet.mock.calls[0] as [string, { params: Record<string, unknown> }];
    expect(config.params.page_size).toBe(DEFAULT_OUTAGES_PAGE_SIZE);
  });

  it("getOutages defaults page_size to the shared constant", async () => {
    await getOutages({ page: 1 });
    const [, config] = mockGet.mock.calls[0] as [string, { params: Record<string, unknown> }];
    expect(config.params.page_size).toBe(DEFAULT_OUTAGES_PAGE_SIZE);
  });

  it("both data paths serialize identical default page sizes", async () => {
    await fetchOutages({ page: 1 });
    await getOutages({ page: 1 });

    expect(mockGet).toHaveBeenCalledTimes(2);
    const fromFetch = (mockGet.mock.calls[0]?.[1] as { params: Record<string, unknown> })?.params.page_size;
    const fromGet = (mockGet.mock.calls[1]?.[1] as { params: Record<string, unknown> })?.params.page_size;
    expect(fromFetch).toBe(fromGet);
    expect(fromFetch).toBe(DEFAULT_OUTAGES_PAGE_SIZE);
  });

  it("parseOutagesFilter defaults page_size to the shared constant", () => {
    const filter = parseOutagesFilter(new URLSearchParams(""));
    expect(filter.page_size).toBe(DEFAULT_OUTAGES_PAGE_SIZE);
  });

  it("parseOutagesFilter honors an explicit page_size", () => {
    const filter = parseOutagesFilter(new URLSearchParams("page_size=25"));
    expect(filter.page_size).toBe(25);
  });

  it("fetchOutages honors an explicit page_size override", async () => {
    await fetchOutages({ page: 1, page_size: 50 });
    const [, config] = mockGet.mock.calls[0] as [string, { params: Record<string, unknown> }];
    expect(config.params.page_size).toBe(50);
  });
});
