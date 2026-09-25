/** ApexChain Network Operations Intelligence Platform */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IDBFactory } from "fake-indexeddb";

import { clearSessionSnapshot, registerQueryClient } from "@/lib/session-snapshot";
import { persistedCache, clearOldSchemaVersions, CACHE_SCHEMA_VERSION } from "@/lib/persisted-cache";
import { mutationQueue } from "@/lib/mutation-queue";
import { QueryClient } from "@tanstack/react-query";

async function flushMicrotasks() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("clearSessionSnapshot", () => {
  beforeEach(() => {
    (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
    // Reset mutation queue
    (mutationQueue as { state?: { queue: unknown[]; isReplaying: boolean } }).state = { queue: [], isReplaying: false };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("clears IndexedDB persisted cache", async () => {
    await persistedCache.set("outages", { items: [1, 2, 3] });
    await persistedCache.set("payments", { items: [4, 5] });

    expect(await persistedCache.get("outages")).toEqual({ items: [1, 2, 3] });
    expect(await persistedCache.get("payments")).toEqual({ items: [4, 5] });

    await clearSessionSnapshot();

    expect(await persistedCache.get("outages")).toBeNull();
    expect(await persistedCache.get("payments")).toBeNull();
  });

  it("clears React Query cache", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    registerQueryClient(queryClient);

    queryClient.setQueryData(["test"], { data: "value" });
    expect(queryClient.getQueryData(["test"])).toEqual({ data: "value" });

    await clearSessionSnapshot();

    expect(queryClient.getQueryData(["test"])).toBeUndefined();
  });

  it("clears mutation queue", async () => {
    const executor = vi.fn().mockResolvedValue(undefined);
    mutationQueue.registerMutationExecutor?.("testType", executor);

    await mutationQueue.enqueue({
      idempotencyKey: "key-1",
      type: "testType",
      payload: { value: "test" },
    });

    expect(mutationQueue.getPending()).toHaveLength(1);

    await clearSessionSnapshot();

    expect(mutationQueue.getPending()).toHaveLength(0);
  });

  it("clears old schema versions", async () => {
    // Write v1 and v2 entries
    const db = (globalThis as { indexedDB: IDBFactory }).indexedDB;
    const request = db.open("apexchain-cache", 2);
    await new Promise<void>((resolve, reject) => {
      request.onsuccess = () => {
        const dbInstance = request.result;
        const tx = dbInstance.transaction("query-cache", "readwrite");
        const store = tx.objectStore("query-cache");
        store.put({
          key: "cache:v1:outages:old",
          data: { items: ["old"] },
          expiresAt: 0,
          updatedAt: Date.now(),
          schemaVersion: 1,
        });
        store.put({
          key: "cache:v2:outages:new",
          data: { items: ["new"] },
          expiresAt: 0,
          updatedAt: Date.now(),
          schemaVersion: 2,
        });
        tx.oncomplete = () => {
          dbInstance.close();
          resolve();
        };
      };
      request.onerror = () => reject(request.error);
    });

    await clearSessionSnapshot();

    // v1 entry should be gone, v2 entry should remain (but clearSessionSnapshot calls clearOldSchemaVersions which removes v1)
    // Actually clearSessionSnapshot clears everything, so both should be gone
    const v1Result = await persistedCache.get("outages:old");
    const v2Result = await persistedCache.get("outages:new");
    expect(v1Result).toBeNull();
    expect(v2Result).toBeNull();
  });
});