import { describe, it, expect } from "vitest";
import { normalizeApiError, type ApiErrorKind } from "@/lib/errors";

interface ErrorShape {
  response?: {
    status?: number;
    data?: {
      detail?: string | { msg: string }[];
      message?: string;
      correlationId?: string;
      requestId?: string;
    };
    headers?: Record<string, string | null | undefined>;
  };
  message?: string;
}

function makeError(shape: ErrorShape): unknown {
  return shape;
}

describe("normalizeApiError", () => {
  describe("status → kind mapping", () => {
    it.each<[number, ApiErrorKind]>([
      [401, "auth"],
      [403, "auth"],
      [422, "validation"],
      [404, "not_found"],
    ])("maps status %i to kind %s", (status, kind) => {
      const err = makeError({
        response: { status, data: { message: "boom" } },
      });
      expect(normalizeApiError(err).kind).toBe(kind);
    });

    it.each<[number, ApiErrorKind]>([
      [500, "unknown"],
      [400, "unknown"],
      [409, "unknown"],
      [429, "unknown"],
      [undefined, "unknown"],
    ])("maps unhandled status %s to kind unknown", (status, kind) => {
      const err = makeError({
        response: status !== undefined ? { status, data: { message: "boom" } } : undefined,
      });
      expect(normalizeApiError(err).kind).toBe(kind);
    });
  });

  describe("payload → message precedence", () => {
    it("prefers a string detail over message", () => {
      const err = makeError({
        response: { status: 422, data: { detail: "detail-string", message: "message" } },
      });
      expect(normalizeApiError(err).message).toBe("detail-string");
    });

    it("joins a detail array of {msg} items with '; '", () => {
      const err = makeError({
        response: {
          status: 422,
          data: { detail: [{ msg: "field a is invalid" }, { msg: "field b is invalid" }] },
        },
      });
      expect(normalizeApiError(err).message).toBe(
        "field a is invalid; field b is invalid"
      );
    });

    it("handles a single-item detail array", () => {
      const err = makeError({
        response: { status: 422, data: { detail: [{ msg: "only one problem" }] } },
      });
      expect(normalizeApiError(err).message).toBe("only one problem");
    });

    it("falls back to response.data.message when no detail present", () => {
      const err = makeError({
        response: { status: 401, data: { message: "Unauthorized" } },
      });
      expect(normalizeApiError(err).message).toBe("Unauthorized");
    });

    it("falls back to error.message when no response payload message", () => {
      const err = makeError({ message: "Network Error" });
      expect(normalizeApiError(err).message).toBe("Network Error");
    });

    it("falls back to 'Unexpected API error' for empty/absent payload", () => {
      expect(normalizeApiError({}).message).toBe("Unexpected API error");
      expect(normalizeApiError(null).message).toBe("Unexpected API error");
      expect(normalizeApiError(undefined).message).toBe("Unexpected API error");
    });
  });

  describe("correlation-id extraction", () => {
    it("prefers the x-correlation-id header over body", () => {
      const err = makeError({
        response: {
          status: 500,
          headers: { "x-correlation-id": "header-id" },
          data: { correlationId: "body-id", requestId: "req-id" },
        },
      });
      expect(normalizeApiError(err).correlationId).toBe("header-id");
    });

    it("falls back to body correlationId when header absent", () => {
      const err = makeError({
        response: { status: 500, data: { correlationId: "body-id" } },
      });
      expect(normalizeApiError(err).correlationId).toBe("body-id");
    });

    it("falls back to body requestId when neither header nor correlationId present", () => {
      const err = makeError({
        response: { status: 500, data: { requestId: "req-id" } },
      });
      expect(normalizeApiError(err).correlationId).toBe("req-id");
    });

    it("is undefined when no correlation id is available anywhere", () => {
      const err = makeError({ response: { status: 500, data: {} } });
      expect(normalizeApiError(err).correlationId).toBeUndefined();
    });
  });

  describe("status passthrough", () => {
    it("exposes the status on the normalized error", () => {
      const err = makeError({ response: { status: 422, data: {} } });
      expect(normalizeApiError(err).status).toBe(422);
    });

    it("leaves status undefined when absent", () => {
      expect(normalizeApiError({}).status).toBeUndefined();
    });
  });
});
