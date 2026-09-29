import { describe, it, expect, vi, afterEach } from "vitest";
import {
  shouldRetry,
  getBackoffDelay,
  parseRetryAfter,
  DEFAULT_MAX_BACKOFF_MS,
} from "@/lib/hermes";
import type { AxiosError } from "axios";

/** Build a minimal AxiosError-shaped object for `shouldRetry`. */
function makeError(options: {
  method?: string | undefined;
  retryCount?: number | undefined;
  status?: number | undefined;
  hasConfig?: boolean;
}): AxiosError {
  const { method = "GET", retryCount = 0, status, hasConfig = true } = options;

  return {
    config: hasConfig ? { method, _retryCount: retryCount } : undefined,
    response: status === undefined ? undefined : { status },
  } as unknown as AxiosError;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Hermes Retry Engine", () => {
  describe("shouldRetry", () => {
    it("returns true for idempotent GET requests on 5xx", () => {
      expect(shouldRetry(makeError({ method: "GET", status: 503 }))).toBe(true);
      expect(shouldRetry(makeError({ method: "GET", status: 500 }))).toBe(true);
      expect(shouldRetry(makeError({ method: "GET", status: 599 }))).toBe(true);
    });

    it("does not treat 600 as a retryable 5xx status", () => {
      expect(shouldRetry(makeError({ method: "GET", status: 600 }))).toBe(false);
    });

    it("returns true for 429 rate limiting on GET", () => {
      expect(shouldRetry(makeError({ method: "GET", status: 429 }))).toBe(true);
    });

    it.each(["POST", "PUT", "PATCH", "DELETE"])(
      "returns false for non-idempotent %s requests even on 5xx",
      (method) => {
        expect(shouldRetry(makeError({ method, status: 503 }))).toBe(false);
      },
    );

    it("matches the method case-insensitively", () => {
      expect(shouldRetry(makeError({ method: "get", status: 503 }))).toBe(true);
    });

    it("returns false for 4xx client errors that are not 429", () => {
      expect(shouldRetry(makeError({ method: "GET", status: 400 }))).toBe(false);
      expect(shouldRetry(makeError({ method: "GET", status: 404 }))).toBe(false);
      expect(shouldRetry(makeError({ method: "GET", status: 401 }))).toBe(false);
    });

    it("returns false once maxRetries is reached", () => {
      expect(shouldRetry(makeError({ retryCount: 3, status: 503 }), 3)).toBe(false);
      expect(shouldRetry(makeError({ retryCount: 4, status: 503 }), 3)).toBe(false);
    });

    it("returns true while still below the maxRetries limit", () => {
      expect(shouldRetry(makeError({ retryCount: 2, status: 503 }), 3)).toBe(true);
    });

    it("honours a custom maxRetries bound", () => {
      expect(shouldRetry(makeError({ retryCount: 0, status: 503 }), 1)).toBe(true);
      expect(shouldRetry(makeError({ retryCount: 1, status: 503 }), 1)).toBe(false);
    });

    it("returns true on network errors with no response", () => {
      expect(shouldRetry(makeError({ method: "GET" }))).toBe(true);
    });

    it("returns false when the request config is missing", () => {
      expect(shouldRetry(makeError({ hasConfig: false, status: 503 }))).toBe(false);
    });

    it("returns false when _retryCount is absent and maxRetries is 0", () => {
      expect(shouldRetry(makeError({ status: 503 }), 0)).toBe(false);
    });
  });

  describe("parseRetryAfter", () => {
    it("parses numeric seconds", () => {
      expect(parseRetryAfter("30")).toBe(30_000);
      expect(parseRetryAfter("120")).toBe(120_000);
      expect(parseRetryAfter("0")).toBe(0);
    });

    it("ignores surrounding whitespace", () => {
      expect(parseRetryAfter("  45  ")).toBe(45_000);
    });

    it("accepts an explicit positive sign", () => {
      expect(parseRetryAfter("+10")).toBe(10_000);
    });

    it("clamps a negative seconds hint to zero instead of sleeping backwards", () => {
      expect(parseRetryAfter("-5")).toBe(0);
    });

    it("parses an HTTP-date in the future as a positive delay", () => {
      const futureDate = new Date(Date.now() + 10_000);
      const delay = parseRetryAfter(futureDate.toUTCString());
      expect(delay).toBeGreaterThanOrEqual(9_000);
      expect(delay).toBeLessThanOrEqual(11_000);
    });

    it("clamps an HTTP-date in the past to zero", () => {
      const pastDate = new Date(Date.now() - 10_000);
      expect(parseRetryAfter(pastDate.toUTCString())).toBe(0);
    });

    it("returns null for malformed values so the caller falls back to the default interval", () => {
      expect(parseRetryAfter("invalid-date")).toBeNull();
      expect(parseRetryAfter("12s")).toBeNull();
      expect(parseRetryAfter("1.5")).toBeNull();
    });

    it("returns null for empty, whitespace, null and undefined headers", () => {
      expect(parseRetryAfter("")).toBeNull();
      expect(parseRetryAfter("   ")).toBeNull();
      expect(parseRetryAfter(null)).toBeNull();
      expect(parseRetryAfter(undefined)).toBeNull();
    });

    it("returns null rather than Infinity for an out-of-range integer", () => {
      expect(parseRetryAfter("9".repeat(400))).toBeNull();
    });

    it("never returns NaN for any input", () => {
      const inputs = ["30", "-5", "", "   ", "invalid", new Date().toUTCString()];
      for (const input of inputs) {
        const result = parseRetryAfter(input);
        if (result !== null) {
          expect(Number.isNaN(result)).toBe(false);
          expect(result).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  describe("getBackoffDelay", () => {
    it("never returns a negative delay and respects the default cap", () => {
      for (let attempt = 0; attempt < 25; attempt += 1) {
        const delay = getBackoffDelay(attempt);
        expect(delay).toBeGreaterThanOrEqual(0);
        expect(delay).toBeLessThanOrEqual(DEFAULT_MAX_BACKOFF_MS);
      }
    });

    it("keeps the exponential window bounded by initialDelay * factor^attempt", () => {
      vi.spyOn(Math, "random").mockReturnValue(1);

      expect(getBackoffDelay(0, 1000, 2)).toBe(1_000);
      expect(getBackoffDelay(1, 1000, 2)).toBe(2_000);
      expect(getBackoffDelay(2, 1000, 2)).toBe(4_000);
    });

    it("applies the cap before jitter, so it never exceeds maxDelayMs", () => {
      vi.spyOn(Math, "random").mockReturnValue(1);

      // Unbounded exponential here would be 1000 * 2^20 (~1.05e9 ms).
      expect(getBackoffDelay(20, 1000, 2)).toBe(DEFAULT_MAX_BACKOFF_MS);
      expect(getBackoffDelay(20, 1000, 2, 5_000)).toBe(5_000);
    });

    it("starts full jitter at zero", () => {
      vi.spyOn(Math, "random").mockReturnValue(0);
      expect(getBackoffDelay(3, 1000, 2)).toBe(0);
    });

    it("treats non-finite or negative attempts as the first attempt", () => {
      vi.spyOn(Math, "random").mockReturnValue(1);

      expect(getBackoffDelay(-5, 1000, 2)).toBe(1_000);
      expect(getBackoffDelay(Number.NaN, 1000, 2)).toBe(1_000);
      expect(getBackoffDelay(Number.POSITIVE_INFINITY, 1000, 2)).toBe(1_000);
    });

    it("honours a custom initial delay and factor", () => {
      vi.spyOn(Math, "random").mockReturnValue(1);

      expect(getBackoffDelay(2, 100, 3)).toBe(900);
    });

    it("spreads delays across the capped window with full jitter", () => {
      const cap = 1_000;
      const samples = Array.from({ length: 2_000 }, () =>
        getBackoffDelay(20, 1_000, 2, cap),
      );

      const min = Math.min(...samples);
      const max = Math.max(...samples);
      const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;

      expect(min).toBeGreaterThanOrEqual(0);
      expect(max).toBeLessThanOrEqual(cap);
      // Full jitter over [0, cap] should average around cap / 2.
      expect(mean).toBeGreaterThan(cap * 0.4);
      expect(mean).toBeLessThan(cap * 0.6);
      // Sanity check that the output is actually jittered, not constant.
      expect(max).toBeGreaterThan(min);
    });
  });
});
