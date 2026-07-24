/** ApexChain Network Operations Intelligence Platform */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiClient } from "@/lib/client";

vi.mock("@/lib/url", () => ({
  buildApiUrl: vi.fn((path: string) => `http://localhost:8000/api/v1${path}`),
}));

describe("apiClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calls fetch with correct URL", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: "test" }),
    } as Response);

    await apiClient("/test-endpoint");

    expect(fetchSpy).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/test-endpoint",
      expect.objectContaining({ credentials: "include" })
    );
  });

  it("throws normalized error on non-ok response", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ detail: "Not found" }),
      headers: new Headers({ "x-correlation-id": "abc-123" }),
    } as Response);

    await expect(apiClient("/missing")).rejects.toThrow();
  });
});
