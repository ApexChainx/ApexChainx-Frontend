/** ApexChain Network Operations Intelligence Platform */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkRateLimit, resetRateLimit, getRemainingAttempts } from "@/lib/rate-limit";

describe("rate-limit", () => {
  beforeEach(() => {
    resetRateLimit("test-key");
  });

  it("allows requests within limit", () => {
    expect(checkRateLimit("test-key", 3, 60_000)).toBe(true);
    expect(checkRateLimit("test-key", 3, 60_000)).toBe(true);
    expect(checkRateLimit("test-key", 3, 60_000)).toBe(true);
  });

  it("blocks requests over limit", () => {
    checkRateLimit("test-key", 2, 60_000);
    checkRateLimit("test-key", 2, 60_000);
    expect(checkRateLimit("test-key", 2, 60_000)).toBe(false);
  });

  it("resets rate limit", () => {
    checkRateLimit("test-key", 1, 60_000);
    expect(checkRateLimit("test-key", 1, 60_000)).toBe(false);
    resetRateLimit("test-key");
    expect(checkRateLimit("test-key", 1, 60_000)).toBe(true);
  });

  it("returns correct remaining attempts", () => {
    expect(getRemainingAttempts("test-key", 3, 60_000)).toBe(3);
    checkRateLimit("test-key", 3, 60_000);
    expect(getRemainingAttempts("test-key", 3, 60_000)).toBe(2);
    checkRateLimit("test-key", 3, 60_000);
    expect(getRemainingAttempts("test-key", 3, 60_000)).toBe(1);
  });
});
