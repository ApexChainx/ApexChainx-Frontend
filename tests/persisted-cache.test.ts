/** ApexChain Network Operations Intelligence Platform */
import { describe, it, expect, vi, beforeEach } from "vitest";
import "fake-indexeddb/auto"; // polyfill global indexedDB for jsdom
import { persistedCache } from "@/lib/persisted-cache";

describe("persistedCache", () => {
  beforeEach(async () => {
    vi.useRealTimers();
    // Fresh state for every test
    await persistedCache.clear();
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // set / get round trip
  // ---------------------------------------------------------------------------

  it("stores and retrieves a value", async () => {
    await persistedCache.set("key-a", { hello: "world" });
    const result = await persistedCache.get<{ hello: string }>("key-a");
    expect(result).toEqual({ hello: "world" });
  });

  it("stores and retrieves a primitive value", async () => {
    await persistedCache.set("count", 42);
    await expect(persistedCache.get<number>("count")).resolves.toBe(42);
  });

  it("returns null for a non-existent key", async () => {
    await expect(persistedCache.get("non-existent")).resolves.toBeNull();
  });

  // ---------------------------------------------------------------------------
  // TTL expiry (only mock Date — not timers — so IndexedDB keeps working)
  // ---------------------------------------------------------------------------

  it("returns the entry before TTL expires", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    await persistedCache.set("temp", "fresh", 60_000); // 1 min TTL
    const result = await persistedCache.get("temp");
    expect(result).toBe("fresh");
    vi.useRealTimers();
  });

  it("returns null after TTL expires", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    await persistedCache.set("temp", "stale", 60_000);

    // Advance past the TTL
    vi.advanceTimersByTime(60_001);
    const result = await persistedCache.get("temp");
    expect(result).toBeNull();
    vi.useRealTimers();
  });

  it("returns the entry exactly at the TTL boundary", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    await persistedCache.set("boundary", "edge", 60_000);

    // Advance to exactly the expiry — Date.now() === expiresAt, so still valid
    vi.advanceTimersByTime(60_000);
    await expect(persistedCache.get("boundary")).resolves.toBe("edge");
    vi.useRealTimers();
  });

  it("never expires when ttlMs is 0", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    await persistedCache.set("eternal", "forever", 0);

    // Advance far into the future
    vi.advanceTimersByTime(86_400_000); // 24 hours
    await expect(persistedCache.get("eternal")).resolves.toBe("forever");

    vi.advanceTimersByTime(365 * 86_400_000); // +1 year
    await expect(persistedCache.get("eternal")).resolves.toBe("forever");
    vi.useRealTimers();
  });

  // ---------------------------------------------------------------------------
  // overwrite same key
  // ---------------------------------------------------------------------------

  it("overwrites an existing key with a new value", async () => {
    await persistedCache.set("key-a", "old-value");
    await persistedCache.set("key-a", "new-value");
    await expect(persistedCache.get("key-a")).resolves.toBe("new-value");
  });

  // ---------------------------------------------------------------------------
  // del
  // ---------------------------------------------------------------------------

  it("removes a key with del", async () => {
    await persistedCache.set("to-delete", "gone");
    await persistedCache.del("to-delete");
    await expect(persistedCache.get("to-delete")).resolves.toBeNull();
  });

  it("del on a non-existent key does not throw", async () => {
    await expect(persistedCache.del("never-existed")).resolves.toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // clear
  // ---------------------------------------------------------------------------

  it("removes all entries with clear", async () => {
    await persistedCache.set("a", 1);
    await persistedCache.set("b", 2);
    await persistedCache.set("c", 3);

    await persistedCache.clear();

    await expect(persistedCache.get("a")).resolves.toBeNull();
    await expect(persistedCache.get("b")).resolves.toBeNull();
    await expect(persistedCache.get("c")).resolves.toBeNull();
  });

  it("clear on an empty store does not throw", async () => {
    await expect(persistedCache.clear()).resolves.toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // IndexedDB unavailable fallback
  // ---------------------------------------------------------------------------

  it("get returns null when IndexedDB is unavailable", async () => {
    const origIndexedDB = globalThis.indexedDB;
    try {
      vi.stubGlobal("indexedDB", undefined);
      await expect(persistedCache.get("any")).resolves.toBeNull();
    } finally {
      vi.stubGlobal("indexedDB", origIndexedDB);
    }
  });

  it("set does not throw when IndexedDB is unavailable", async () => {
    const origIndexedDB = globalThis.indexedDB;
    try {
      vi.stubGlobal("indexedDB", undefined);
      await expect(persistedCache.set("any", "value")).resolves.toBeUndefined();
    } finally {
      vi.stubGlobal("indexedDB", origIndexedDB);
    }
  });

  it("del does not throw when IndexedDB is unavailable", async () => {
    const origIndexedDB = globalThis.indexedDB;
    try {
      vi.stubGlobal("indexedDB", undefined);
      await expect(persistedCache.del("any")).resolves.toBeUndefined();
    } finally {
      vi.stubGlobal("indexedDB", origIndexedDB);
    }
  });

  it("clear does not throw when IndexedDB is unavailable", async () => {
    const origIndexedDB = globalThis.indexedDB;
    try {
      vi.stubGlobal("indexedDB", undefined);
      await expect(persistedCache.clear()).resolves.toBeUndefined();
    } finally {
      vi.stubGlobal("indexedDB", origIndexedDB);
    }
  });
});