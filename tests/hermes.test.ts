import { describe, it, expect } from "vitest";
import { shouldRetry, getBackoffDelay, parseRetryAfter } from "@/lib/hermes";
import type { AxiosError } from "axios";

describe("Hermes Retry Engine", () => {
  describe("shouldRetry", () => {
    it("returns true for idempotent GET requests on 5xx", () => {
      const mockError = {
        config: { method: "GET", _retryCount: 0 },
        response: { status: 503 },
      } as unknown as AxiosError;
      expect(shouldRetry(mockError)).toBe(true);
    });

    it("returns false for POST requests even on 5xx", () => {
      const mockError = {
        config: { method: "POST", _retryCount: 0 },
        response: { status: 503 },
      } as unknown as AxiosError;
      expect(shouldRetry(mockError)).toBe(false);
    });

    it("returns false if maxRetries limit is reached", () => {
      const mockError = {
        config: { method: "GET", _retryCount: 3 },
        response: { status: 503 },
      } as unknown as AxiosError;
      expect(shouldRetry(mockError, 3)).toBe(false);
    });

    it("returns true on network errors with no response", () => {
      const mockError = {
        config: { method: "GET", _retryCount: 0 },
      } as unknown as AxiosError;
      expect(shouldRetry(mockError)).toBe(true);
    });

    it("returns false when a request overrides the default with a long timeout", () => {
      const mockError = {
        config: { method: "GET", _retryCount: 0, timeout: 120_000 },
        response: { status: 503 },
      } as unknown as AxiosError;
      expect(shouldRetry(mockError)).toBe(false);
    });

    it("still retries requests using the default timeout", () => {
      const mockError = {
        config: { method: "GET", _retryCount: 0, timeout: 15_000 },
      } as unknown as AxiosError;
      expect(shouldRetry(mockError)).toBe(true);
    });
  });

  describe("parseRetryAfter", () => {
    it("parses numeric seconds", () => {
      expect(parseRetryAfter("30")).toBe(30000);
      expect(parseRetryAfter("120")).toBe(120000);
    });

    it("parses HTTP-date correctly", () => {
      const futureDate = new Date(Date.now() + 10000);
      const delay = parseRetryAfter(futureDate.toUTCString());
      expect(delay).toBeGreaterThanOrEqual(9000);
      expect(delay).toBeLessThanOrEqual(11000);
    });

    it("returns null for invalid values", () => {
      expect(parseRetryAfter("")).toBeNull();
      expect(parseRetryAfter("invalid-date")).toBeNull();
    });
  });

  describe("getBackoffDelay", () => {
    it("calculates delay within exponential bounds with jitter", () => {
      const delay = getBackoffDelay(1, 1000, 2);
      expect(delay).toBeGreaterThanOrEqual(0);
      expect(delay).toBeLessThanOrEqual(2000);
    });
  });
});
