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
      headers: new Headers({ "content-type": "application/json" }),
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

  it("returns undefined on 204 No Content", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 204,
      json: () => Promise.reject(new SyntaxError("Unexpected end of JSON input")),
      headers: new Headers(),
    } as Response);

    await expect(apiClient("/empty")).resolves.toBeUndefined();
  });

  it("returns undefined on 205 Reset Content", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 205,
      json: () => Promise.reject(new SyntaxError("Unexpected end of JSON input")),
      headers: new Headers(),
    } as Response);

    await expect(apiClient("/reset")).resolves.toBeUndefined();
  });

  it("parses JSON for a 2xx response with a JSON content type", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: "test" }),
      headers: new Headers({ "content-type": "application/json" }),
    } as Response);

    await expect(apiClient("/ok")).resolves.toEqual({ data: "test" });
  });

  it("returns undefined for a 2xx response with a non-JSON content type", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.reject(new SyntaxError("Unexpected end of JSON input")),
      headers: new Headers({ "content-type": "text/plain" }),
    } as Response);

    await expect(apiClient("/text")).resolves.toBeUndefined();
  });
});
