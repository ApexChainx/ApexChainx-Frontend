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
const DB_VERSION = 1;
const STORE_NAME = "query-cache";

export interface CacheEntry<T = unknown> {
  key: string;
  data: T;
  expiresAt: number; // epoch ms — 0 means no expiry
  updatedAt: number; // epoch ms
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

export const persistedCache = {
  /**
   * Store a value. Overwrites any existing entry with the same key.
   * Pass ttlMs = 0 for no expiration.
   */
  async set<T>(key: string, data: T, ttlMs = 1000 * 60 * 30): Promise<void> {
    try {
      const db = await openDb();
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);

      const entry: CacheEntry<T> = {
        key,
        data,
        expiresAt: ttlMs > 0 ? Date.now() + ttlMs : 0,
        updatedAt: Date.now(),
      };

      store.put(entry);
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    } catch (err) {
      console.warn("[persisted-cache] set failed:", err);
    }
  },

  /**
   * Retrieve a cached value. Returns `null` when:
   *  - The key does not exist
   *  - The entry has expired (ttl elapsed)
   *  - IndexedDB is unavailable
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const db = await openDb();
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);

      const request = store.get(key);
      const entry = await new Promise<CacheEntry<T> | undefined>(
        (resolve, reject) => {
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        },
      );
      db.close();

      if (!entry) return null;

      // Check expiration
      if (entry.expiresAt > 0 && Date.now() > entry.expiresAt) {
        // Expired — remove it in the background
        void persistedCache.del(key);
        return null;
      }

      return entry.data;
    } catch (err) {
      console.warn("[persisted-cache] get failed:", err);
      return null;
    }
  },

  /**
   * Delete a single key from the cache.
   */
  async del(key: string): Promise<void> {
    try {
      const db = await openDb();
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.delete(key);
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    } catch (err) {
      console.warn("[persisted-cache] del failed:", err);
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
      console.warn("[persisted-cache] clear failed:", err);
    }
  },
};
