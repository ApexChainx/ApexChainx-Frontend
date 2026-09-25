import { describe, expect, it } from "vitest";
import { normalizeApiError, ApiError } from "@/lib/errors";

const error = (status?: number, data?: unknown, message?: string, headers?: Record<string, string | null>) => ({
  response: { status, data, headers },
  message,
});

describe("normalizeApiError", () => {
  it.each([
    [401, "auth"],
    [403, "auth"],
    [422, "validation"],
    [409, "conflict"],
    [429, "rate_limit"],
    [404, "not_found"],
    [500, "unknown"],
  ] as const)("maps status %s to %s", (status, kind) => {
    expect(normalizeApiError(error(status)).kind).toBe(kind);
  });

  it("joins FastAPI detail arrays", () => {
    expect(normalizeApiError(error(422, { detail: [{ msg: "first" }, { msg: "second" }] })).message)
      .toBe("first; second");
  });

  it("handles a single detail item", () => {
    expect(normalizeApiError(error(422, { detail: [{ msg: "invalid" }] })).message).toBe("invalid");
  });

  it("uses detail string before message, error message, and fallback", () => {
    expect(normalizeApiError(error(400, { detail: "detail", message: "body" }, "error")).message).toBe("detail");
    expect(normalizeApiError(error(400, { message: "body" }, "error")).message).toBe("body");
    expect(normalizeApiError(error(400, undefined, "error")).message).toBe("error");
    expect(normalizeApiError(error(400)).message).toBe("Unexpected API error");
  });

  it("prefers the header correlation id, then body ids", () => {
    expect(normalizeApiError(error(500, { correlationId: "body", requestId: "request" }, undefined, {
      "x-correlation-id": "header",
    })).correlationId).toBe("header");
    expect(normalizeApiError(error(500, { requestId: "request" })).correlationId).toBe("request");
  });
});

describe("ApiError", () => {
  it("preserves correlationId from response headers", () => {
    const apiError = ApiError.fromError(
      error(500, { message: "Server error" }, undefined, { "x-correlation-id": "corr-123" })
    );
    expect(apiError.correlationId).toBe("corr-123");
    expect(apiError.message).toBe("Server error");
    expect(apiError.kind).toBe("unknown");
    expect(apiError.status).toBe(500);
  });

  it("preserves correlationId from response body", () => {
    const apiError = ApiError.fromError(
      error(404, { correlationId: "body-corr-456", message: "Not found" })
    );
    expect(apiError.correlationId).toBe("body-corr-456");
    expect(apiError.kind).toBe("not_found");
  });

  it("preserves original error as cause", () => {
    const original = new Error("network error");
    const apiError = ApiError.fromError(
      error(500, { message: "Server error" }, "network error"),
      original
    );
    expect(apiError.originalError).toBe(original);
    expect(apiError.cause).toBe(original);
  });

  it("includes kind based on status code", () => {
    const authError = ApiError.fromError(error(401));
    expect(authError.kind).toBe("auth");

    const validationError = ApiError.fromError(error(422));
    expect(validationError.kind).toBe("validation");

    const notFoundError = ApiError.fromError(error(404));
    expect(notFoundError.kind).toBe("not_found");
  });

  it("maintains proper stack trace", () => {
    const apiError = ApiError.fromError(error(500));
    expect(apiError.stack).toBeDefined();
    expect(apiError.stack).toContain("ApiError");
  });
});
