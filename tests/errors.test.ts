/** ApexChain Network Operations Intelligence Platform */
import { describe, it, expect } from "vitest";
import { normalizeApiError } from "@/lib/errors";

describe("normalizeApiError", () => {
  it("maps 401 to auth", () => {
    const err = normalizeApiError({ response: { status: 401, data: { detail: "Unauthorized" } } });
    expect(err.kind).toBe("auth");
  });

  it("maps 403 to auth", () => {
    const err = normalizeApiError({ response: { status: 403, data: {} } });
    expect(err.kind).toBe("auth");
  });

  it("maps 404 to not_found", () => {
    const err = normalizeApiError({ response: { status: 404, data: { detail: "Not found" } } });
    expect(err.kind).toBe("not_found");
  });

  it("maps 422 to validation", () => {
    const err = normalizeApiError({ response: { status: 422, data: { detail: [{ msg: "field required" }] } } });
    expect(err.kind).toBe("validation");
    expect(err.message).toBe("field required");
  });

  it("maps 429 to rate_limit", () => {
    const err = normalizeApiError({ response: { status: 429, data: { detail: "Too Many Requests" } } });
    expect(err.kind).toBe("rate_limit");
  });

  it("maps 409 to conflict", () => {
    const err = normalizeApiError({ response: { status: 409, data: { detail: "Conflict" } } });
    expect(err.kind).toBe("conflict");
  });

  it("falls back to unknown for unmapped statuses", () => {
    const err = normalizeApiError({ response: { status: 500, data: {} } });
    expect(err.kind).toBe("unknown");
  });

  it("prefers detail over message", () => {
    const err = normalizeApiError({ response: { status: 400, data: { detail: "bad", message: "fallback" } } });
    expect(err.message).toBe("bad");
  });

  it("extracts correlation id from headers", () => {
    const err = normalizeApiError({
      response: { status: 400, data: {}, headers: { "x-correlation-id": "abc-123" } },
    });
    expect(err.correlationId).toBe("abc-123");
  });

  it("uses generic message when nothing is available", () => {
    const err = normalizeApiError({});
    expect(err.message).toBe("Unexpected API error");
    expect(err.kind).toBe("unknown");
  });
});
