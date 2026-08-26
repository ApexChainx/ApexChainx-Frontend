/** ApexChain Frontend Test Suite */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api, LONG_RUNNING_TIMEOUT_MS } from "@/lib/api";
import { exportOutages } from "@/services/exportService";

function stubDownloadHelpers() {
  // jsdom has no URL.createObjectURL/revokeObjectURL — stub the download flow.
  vi.stubGlobal("URL", {
    createObjectURL: vi.fn(() => "blob:mock"),
    revokeObjectURL: vi.fn(),
  });
  const anchor = { href: "", download: "", click: vi.fn(), remove: vi.fn() };
  vi.spyOn(document, "createElement").mockReturnValue(anchor as unknown as HTMLElement);
  vi.spyOn(document.body, "appendChild").mockImplementation(() => anchor as unknown as Node);
}

describe("exportOutages timeout override", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("overrides the 15s default with the long-running export timeout", async () => {
    const getSpy = vi
      .spyOn(api, "get")
      .mockResolvedValue({
        data: new Blob(["a,b\n1,2"], { type: "text/csv" }),
        headers: {},
      } as never);
    stubDownloadHelpers();

    await exportOutages("csv", {});

    expect(getSpy).toHaveBeenCalledWith(
      "/outages/export",
      expect.objectContaining({
        responseType: "blob",
        timeout: LONG_RUNNING_TIMEOUT_MS,
      }),
    );
  });
});
