/** ApexChain Network Operations Intelligence Platform */
import { afterEach, describe, expect, it, vi } from "vitest";

import { api } from "@/lib/api";
import { fetchOutages } from "@/lib/outages";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchOutages page_size default", () => {
  it("uses the UI pager default (10) when page_size is unspecified", async () => {
    const spy = vi.spyOn(api, "get").mockResolvedValue({
      data: { items: [], page: 1, page_size: 10, total: 0 },
    });

    await fetchOutages({ page: 1 });

    expect(spy).toHaveBeenCalledWith("/outages", {
      params: expect.objectContaining({ page_size: 10 }),
    });
  });

  it("honors an explicit page_size", async () => {
    const spy = vi.spyOn(api, "get").mockResolvedValue({
      data: { items: [], page: 1, page_size: 50, total: 0 },
    });

    await fetchOutages({ page: 1, page_size: 50 });

    expect(spy).toHaveBeenCalledWith("/outages", {
      params: expect.objectContaining({ page_size: 50 }),
    });
  });
});
