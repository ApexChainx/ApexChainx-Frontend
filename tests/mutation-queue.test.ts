/** ApexChain Network Operations Intelligence Platform */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IDBFactory } from "fake-indexeddb";

import { mutationQueue, registerMutationExecutor } from "@/lib/mutation-queue";
import { persistedCache, clearOldSchemaVersions, CACHE_SCHEMA_VERSION } from "@/lib/persisted-cache";

async function flushMicrotasks() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("mutationQueue", () => {
  beforeEach(() => {
    (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
    // Reset queue state
    (mutationQueue as { state?: { queue: unknown[] } }).state = { queue: [], isReplaying: false };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("enqueues and replays a mutation", async () => {
    const executor = vi.fn().mockResolvedValue(undefined);
    registerMutationExecutor("testType", executor);

    await mutationQueue.enqueue({
      idempotencyKey: "key-1",
      type: "testType",
      payload: { value: "test" },
    });

    const pending = mutationQueue.getPending();
    expect(pending).toHaveLength(1);
    expect(pending[0].idempotencyKey).toBe("key-1");

    await mutationQueue.replay();

    expect(executor).toHaveBeenCalledWith({ value: "test" });
    expect(mutationQueue.getPending()).toHaveLength(0);
  });

  it("deduplicates by idempotency key", async () => {
    const executor = vi.fn().mockResolvedValue(undefined);
    registerMutationExecutor("testType", executor);

    await mutationQueue.enqueue({
      idempotencyKey: "same-key",
      type: "testType",
      payload: { value: "first" },
    });

    await mutationQueue.enqueue({
      idempotencyKey: "same-key",
      type: "testType",
      payload: { value: "second" },
    });

    expect(mutationQueue.getPending()).toHaveLength(1);
    expect(mutationQueue.getPending()[0].payload).toEqual({ value: "second" });
  });

  it("retries on failure up to max retries", async () => {
    const executor = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValue(undefined);
    registerMutationExecutor("retryType", executor);

    await mutationQueue.enqueue({
      idempotencyKey: "retry-key",
      type: "retryType",
      payload: { value: "test" },
    });

    // First attempt
    await mutationQueue.replay();
    expect(executor).toHaveBeenCalledTimes(1);
    expect(mutationQueue.getPending()).toHaveLength(1);
    expect(mutationQueue.getPending()[0].retries).toBe(1);

    // Second attempt
    await mutationQueue.replay();
    expect(executor).toHaveBeenCalledTimes(2);
    expect(mutationQueue.getPending()).toHaveLength(1);
    expect(mutationQueue.getPending()[0].retries).toBe(2);

    // Third attempt (success)
    await mutationQueue.replay();
    expect(executor).toHaveBeenCalledTimes(3);
    expect(mutationQueue.getPending()).toHaveLength(0);
  });

  it("drops mutation after max retries", async () => {
    const executor = vi.fn().mockRejectedValue(new Error("fail"));
    registerMutationExecutor("dropType", executor);

    await mutationQueue.enqueue({
      idempotencyKey: "drop-key",
      type: "dropType",
      payload: { value: "test" },
    });

    // Retry 5 times (MAX_RETRIES)
    for (let i = 0; i < 5; i++) {
      await mutationQueue.replay();
    }

    // Should be dropped after max retries
    expect(mutationQueue.getPending()).toHaveLength(0);
    expect(executor).toHaveBeenCalledTimes(5);
  });

  it("persists queue to IndexedDB", async () => {
    await mutationQueue.enqueue({
      idempotencyKey: "persist-key",
      type: "testType",
      payload: { value: "test" },
    });

    await flushMicrotasks();

    // Read from IndexedDB directly
    const cached = await persistedCache.get<{ queue: unknown[] }>("mutation-queue");
    expect(cached).toBeDefined();
    expect(cached?.length).toBe(1);
  });

  it("loads queue from IndexedDB on init", async () => {
    // Pre-populate queue in IndexedDB
    await persistedCache.set("mutation-queue", [
      { idempotencyKey: "loaded-key", type: "testType", payload: { value: "loaded" }, timestamp: Date.now(), retries: 0 },
    ], 0);

    await flushMicrotasks();

    // Re-initialize queue (simulates page reload)
    (mutationQueue as { state?: { queue: unknown[] } }).state = { queue: [], isReplaying: false };
    await mutationQueue.init();

    const pending = mutationQueue.getPending();
    expect(pending).toHaveLength(1);
    expect(pending[0].idempotencyKey).toBe("loaded-key");
  });

  it("clears queue on logout", async () => {
    await mutationQueue.enqueue({
      idempotencyKey: "clear-key",
      type: "testType",
      payload: { value: "test" },
    });

    await mutationQueue.clear();

    expect(mutationQueue.getPending()).toHaveLength(0);
    const cached = await persistedCache.get("mutation-queue");
    expect(cached).toEqual([]);
  });
});