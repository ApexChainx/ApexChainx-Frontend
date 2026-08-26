import { describe, expect, it, vi } from "vitest";

const get = vi.fn();

vi.mock("@/lib/api", () => ({
  api: { get },
}));

describe("outage query contract", () => {
  it("serializes sorting consistently through the fetch helper", async () => {
    const { fetchOutages } = await import("@/lib/outages");
    get.mockResolvedValue({ data: { items: [], page: 1, page_size: 10, total: 0 } });

    await fetchOutages({ page: 1, sort_field: "severity", sort_order: "asc" });

    expect(get).toHaveBeenCalledWith("/outages", {
      params: expect.objectContaining({
        sort_field: "severity",
        sort_order: "asc",
      }),
    });
    expect(get.mock.calls[0]?.[1].params).not.toHaveProperty("sort");
  });
});
