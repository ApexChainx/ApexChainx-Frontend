/** ApexChain Network Operations Intelligence Platform */
/**
 * Persisted Query Cache — IndexedDB persistence layer
 *
 * Issue #130 — Implement offline-first read cache for outages.
 *
 * On startup the useOutages hook hydrates from this store, falls back to
 * the React Query network fetch, and writes fresh data back on every
 * successful fetch. When the backend is unreachable the operator still
 * sees the last-known list of outages.
 *
 * Issue #563 — Schema versioning: cache keys now include a version prefix
 * (e.g. `cache:v2:outages:...`) so that backend response shape changes
 * don't cause stale data to render. On version mismatch the old namespace
 * is dropped during bootstrap.
 *
 * Issue #564 — Hydration failures are reported to Sentry with the operation
 * name and cache key, and a one-time console warning is emitted. Recurring
 * structured-clone errors trigger a targeted namespace purge.
 *
 * API
 * ----
 *   import { persistedCache } from "@/lib/persisted-cache";
 *
 *   // Write (upsert)
 *   await persistedCache.set("outages", data, ttlMs);
 *
 *   // Read
 *   const cached = await persistedCache.get<PaginatedOutages>("outages");
 *
 *   // Delete
 *   await persistedCache.del("outages");
 *
 *   // Wipe entire store
 *   await persistedCache.clear();
 */

const DB_NAME = "apexchain-cache";
const DB_VERSION = 2;
const STORE_NAME = "query-cache";

// Schema version - bump when backend response shapes change
export const CACHE_SCHEMA_VERSION = 2;

export interface CacheEntry<T = unknown> {
  key: string;
  data: T;
  expiresAt: number; // epoch ms — 0 means no expiry
  updatedAt: number; // epoch ms
  schemaVersion: number;
}

let hydrationWarningEmitted = false;
let structuredCloneErrorCount = 0;

function reportHydrationFailure(operation: string, key: string, error: unknown): void {
  const payload = {
    operation,
    cacheKey: key,
    message: error instanceof Error ? error.message : String(error),
    schemaVersion: CACHE_SCHEMA_VERSION,
  };

  // Report to Sentry if available
  if (typeof window !== "undefined" && (window as { Sentry?: { captureException: (err: Error) => void } }).Sentry) {
    const sentryError = new Error(`IndexedDB ${operation} failed for key: ${key}`);
    sentryError.cause = error instanceof Error ? error : new Error(String(error));
    (window as { Sentry: { captureException: (err: Error) => void } }).Sentry.captureException(sentryError);
  }

  // One-time console warning
  if (!hydrationWarningEmitted) {
    console.warn("[persisted-cache] Hydration failure detected. Falling back to network. Details:", payload);
    hydrationWarningEmitted = true;
  }

  // Track structured-clone errors for targeted purge
  if (error instanceof Error && error.name === "DataCloneError") {
    structuredCloneErrorCount += 1;
    if (structuredCloneErrorCount >= 3) {
      // Purge the namespace after recurring structured-clone errors
      void purgeNamespace(key.split(":")[1] ?? "unknown");
    }
  }
}

async function purgeNamespace(prefix: string): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const allKeys = await new Promise<string[]>((resolve, reject) => {
      const request = store.getAllKeys();
      request.onsuccess = () => resolve(request.result as string[]);
      request.onerror = () => reject(request.error);
    });
    for (const key of allKeys) {
      if (typeof key === "string" && key.startsWith(`cache:v${CACHE_SCHEMA_VERSION}:${prefix}:`)) {
        store.delete(key);
      }
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    structuredCloneErrorCount = 0;
  } catch {
    // Best effort purge
  }
}

function buildKey(key: string): string {
  return `cache:v${CACHE_SCHEMA_VERSION}:${key}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this environment."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Clear old schema versions on bootstrap
export async function clearOldSchemaVersions(): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const allKeys = await new Promise<string[]>((resolve, reject) => {
      const request = store.getAllKeys();
      request.onsuccess = () => resolve(request.result as string[]);
      request.onerror = () => reject(request.error);
    });
    for (const key of allKeys) {
      if (typeof key === "string" && key.startsWith("cache:v") && !key.startsWith(`cache:v${CACHE_SCHEMA_VERSION}:`)) {
        store.delete(key);
      }
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Best effort cleanup
  }
}

export const persistedCache = {
  /**
   * Store a value. Overwrites any existing entry with the same key.
   * Pass ttlMs = 0 for no expiration.
   */
  async set<T>(key: string, data: T, ttlMs = 1000 * 60 * 30): Promise<void> {
    const fullKey = buildKey(key);
    try {
      const db = await openDb();
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);

      const entry: CacheEntry<T> = {
        key: fullKey,
        data,
        expiresAt: ttlMs > 0 ? Date.now() + ttlMs : 0,
        updatedAt: Date.now(),
        schemaVersion: CACHE_SCHEMA_VERSION,
      };

      store.put(entry);
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    } catch (err) {
      reportHydrationFailure("set", fullKey, err);
    }
  },

  /**
   * Retrieve a cached value. Returns `null` when:
   *  - The key does not exist
   *  - The entry has expired (ttl elapsed)
   *  - IndexedDB is unavailable
   *  - Schema version mismatch
   */
  async get<T>(key: string): Promise<T | null> {
    const fullKey = buildKey(key);
    try {
      const db = await openDb();
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);

      const request = store.get(fullKey);
      const entry = await new Promise<CacheEntry<T> | undefined>(
        (resolve, reject) => {
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        },
      );
      db.close();

      if (!entry) return null;

      // Check schema version mismatch
      if (entry.schemaVersion !== CACHE_SCHEMA_VERSION) {
        return null;
      }

      // Check expiration
      if (entry.expiresAt > 0 && Date.now() > entry.expiresAt) {
        // Expired — remove it in the background
        void persistedCache.del(key);
        return null;
      }

      return entry.data;
    } catch (err) {
      reportHydrationFailure("get", fullKey, err);
      return null;
    }
  },

  /**
   * Delete a single key from the cache.
   */
  async del(key: string): Promise<void> {
    const fullKey = buildKey(key);
    try {
      const db = await openDb();
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.delete(fullKey);
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    } catch (err) {
      reportHydrationFailure("del", fullKey, err);
    }
  },

  /**
   * Remove all entries from the cache.
   */
  async clear(): Promise<void> {
    try {
      const db = await openDb();
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    } catch (err) {
      reportHydrationFailure("clear", "all", err);
    }
  },
};
