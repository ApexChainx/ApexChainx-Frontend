/** ApexChain Network Operations Intelligence Platform */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IDBFactory } from "fake-indexeddb";

import { debouncedCacheSet, flushPendingWrites, cancelPendingWrite, getPendingWriteCount } from "@/lib/debounced-cache";
import { persistedCache } from "@/lib/persisted-cache";

async function flushMicrotasks() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("debouncedCacheSet", () => {
  beforeEach(() => {
    (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("coalesces multiple rapid writes to the same key", async () => {
    const write1 = debouncedCacheSet("key-1", { value: "first" }, 1000, 500);
    const write2 = debouncedCacheSet("key-1", { value: "second" }, 1000, 500);
    const write3 = debouncedCacheSet("key-1", { value: "third" }, 1000, 500);

    // Fast-forward time but not enough for debounce
    vi.advanceTimersByTime(250);
    expect(getPendingWriteCount()).toBe(1);

    // Fast-forward past debounce
    await vi.advanceTimersByTimeAsync(300);

    await Promise.all([write1, write2, write3]);

    // Only the last value should be persisted
    const result = await persistedCache.get<{ value: string }>("key-1");
    expect(result).toEqual({ value: "third" });
  });

  it("writes different keys independently", async () => {
    const write1 = debouncedCacheSet("key-a", { value: "a" }, 1000, 500);
    const write2 = debouncedCacheSet("key-b", { value: "b" }, 1000, 500);

    await vi.advanceTimersByTimeAsync(600);

    await Promise.all([write1, write2]);

    const resultA = await persistedCache.get<{ value: string }>("key-a");
    const resultB = await persistedCache.get<{ value: string }>("key-b");
    expect(resultA).toEqual({ value: "a" });
    expect(resultB).toEqual({ value: "b" });
  });

  it("can cancel a pending write", async () => {
    const write1 = debouncedCacheSet("key-1", { value: "should-be-cancelled" }, 1000, 500);
    cancelPendingWrite("key-1");

    await vi.advanceTimersByTimeAsync(600);

    const result = await persistedCache.get("key-1");
    expect(result).toBeNull();
  });

  it("flushPendingWrites writes all pending immediately", async () => {
    debouncedCacheSet("key-1", { value: "a" }, 1000, 500);
    debouncedCacheSet("key-2", { value: "b" }, 1000, 500);

    expect(getPendingWriteCount()).toBe(2);

    await flushPendingWrites();

    expect(getPendingWriteCount()).toBe(0);

    const result1 = await persistedCache.get<{ value: string }>("key-1");
    const result2 = await persistedCache.get<{ value: string }>("key-2");
    expect(result1).toEqual({ value: "a" });
    expect(result2).toEqual({ value: "b" });
  });

  it("rejects cancelled promises", async () => {
    const write1 = debouncedCacheSet("key-1", { value: "a" }, 1000, 500);
    cancelPendingWrite("key-1");

    await vi.advanceTimersByTimeAsync(600);

    await expect(write1).rejects.toThrow("Cancelled");
  });
});