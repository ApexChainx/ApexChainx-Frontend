/** ApexChain Network Operations Intelligence Platform */
import { afterEach, describe, expect, it, vi } from "vitest";

import { api } from "@/lib/api";
import { fetchOutages } from "@/lib/outages";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchOutages abort support", () => {
  it("forwards an AbortSignal so in-flight requests can be cancelled", async () => {
    const spy = vi.spyOn(api, "get").mockResolvedValue({
      data: { items: [], page: 1, page_size: 10, total: 0 },
    });
    const controller = new AbortController();

    await fetchOutages({ page: 1 }, { signal: controller.signal });

    expect(spy).toHaveBeenCalledWith(
      "/outages",
      expect.objectContaining({ signal: controller.signal }),
    );
  });
});
