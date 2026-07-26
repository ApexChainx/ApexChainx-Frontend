import { describe, it, expect, vi, beforeEach } from "vitest";
import { CircuitBreaker } from "@/lib/api";

describe("Circuit Breaker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("should start in CLOSED state", () => {
    const breaker = new CircuitBreaker(3, 5000);
    expect(breaker.getState()).toBe("CLOSED");
  });

  it("should transition to OPEN after threshold failures", () => {
    const breaker = new CircuitBreaker(3, 5000);

    breaker.recordFailure();
    expect(breaker.getState()).toBe("CLOSED");

    breaker.recordFailure();
    expect(breaker.getState()).toBe("CLOSED");

    breaker.recordFailure();
    expect(breaker.getState()).toBe("OPEN");
  });

  it("should transition to HALF_OPEN after cooldown period", () => {
    const breaker = new CircuitBreaker(2, 5000);
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.getState()).toBe("OPEN");

    vi.advanceTimersByTime(4999);
    expect(breaker.getState()).toBe("OPEN");

    vi.advanceTimersByTime(1);
    expect(breaker.getState()).toBe("HALF_OPEN");
  });

  it("should transition back to CLOSED after success in HALF_OPEN state", () => {
    const breaker = new CircuitBreaker(2, 5000);
    breaker.recordFailure();
    breaker.recordFailure();

    vi.advanceTimersByTime(5000);
    expect(breaker.getState()).toBe("HALF_OPEN");

    breaker.recordSuccess();
    expect(breaker.getState()).toBe("CLOSED");
    expect(breaker.failureCount).toBe(0);
  });

  it("should transition back to OPEN after failure in HALF_OPEN state", () => {
    const breaker = new CircuitBreaker(2, 5000);
    breaker.recordFailure();
    breaker.recordFailure();

    vi.advanceTimersByTime(5000);
    expect(breaker.getState()).toBe("HALF_OPEN");

    breaker.recordFailure();
    expect(breaker.getState()).toBe("OPEN");
  });
});
