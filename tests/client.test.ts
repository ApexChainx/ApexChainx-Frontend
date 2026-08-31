/** ApexChain Network Operations Intelligence Platform */
import { afterEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/lib/client";

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(response: Partial<Response> & { status: number }) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
}

describe("apiClient empty-body handling", () => {
  it("returns null for a 204 No Content response", async () => {
    stubFetch({ ok: true, status: 204, json: vi.fn(), text: vi.fn() });

    await expect(apiClient("/health")).resolves.toBeNull();
  });

  it("returns null for an empty success body without throwing", async () => {
    stubFetch({ ok: true, status: 200, json: vi.fn(), text: vi.fn().mockResolvedValue("") });

    await expect(apiClient("/health")).resolves.toBeNull();
  });

  it("parses a non-empty JSON success body", async () => {
    stubFetch({
      ok: true,
      status: 200,
      json: vi.fn(),
      text: vi.fn().mockResolvedValue("{\"ok\":true}"),
    });

    await expect(apiClient("/health")).resolves.toEqual({ ok: true });
  });

  it("throws a normalized error for non-ok responses", async () => {
    stubFetch({
      ok: false,
      status: 500,
      json: vi.fn().mockResolvedValue({ detail: "boom" }),
      text: vi.fn(),
    });

    await expect(apiClient("/oops")).rejects.toThrow();
  });
});
