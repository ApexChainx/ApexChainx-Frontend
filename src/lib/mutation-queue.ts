/** ApexChain Network Operations Intelligence Platform */
/**
 * Mutation Queue — Background sync for offline mutations
 *
 * Issue #562 — Introduce a mutation queue persisted to IndexedDB with
 * per-action idempotency keys, replay on reconnect, and surface pending
 * items in the offline banner.
 *
 * API
 * ----
 *   import { mutationQueue } from "@/lib/mutation-queue";
 *
 *   // Queue a mutation for offline replay
 *   await mutationQueue.enqueue({
 *     idempotencyKey: "resolve-outage-123",
 *     type: "resolveOutage",
 *     payload: { id: "123", mttr_minutes: 30 },
 *   });
 *
 *   // Manually trigger replay (also happens automatically on reconnect)
 *   await mutationQueue.replay();
 *
 *   // Get pending mutations for UI
 *   const pending = mutationQueue.getPending();
 */

import { persistedCache, clearOldSchemaVersions } from "@/lib/persisted-cache";

const MUTATION_QUEUE_KEY = "mutation-queue";
const MAX_RETRIES = 5;

export interface QueuedMutation<T = unknown> {
  idempotencyKey: string;
  type: string;
  payload: T;
  timestamp: number;
  retries: number;
}

interface MutationQueueState {
  queue: QueuedMutation[];
  isReplaying: boolean;
}

let state: MutationQueueState = {
  queue: [],
  isReplaying: false,
};

let subscribers = new Set<(queue: QueuedMutation[]) => void>();

function notifySubscribers(): void {
  subscribers.forEach((cb) => cb(state.queue));
}

async function loadQueue(): Promise<void> {
  const cached = await persistedCache.get<QueuedMutation[]>(MUTATION_QUEUE_KEY);
  if (cached) {
    state.queue = cached;
    notifySubscribers();
  }
}

async function saveQueue(): Promise<void> {
  await persistedCache.set(MUTATION_QUEUE_KEY, state.queue, 0); // No TTL for mutation queue
  notifySubscribers();
}

// Type map for mutation executors
type MutationExecutor<T> = (payload: T) => Promise<void>;

const executors = new Map<string, MutationExecutor<unknown>>();

export function registerMutationExecutor<T>(type: string, executor: MutationExecutor<T>): void {
  executors.set(type, executor);
}

export const mutationQueue = {
  /**
   * Initialize the queue - call on app bootstrap
   */
  async init(): Promise<void> {
    await clearOldSchemaVersions();
    await loadQueue();
    // Auto-replay on init (reconnect)
    if (state.queue.length > 0) {
      void mutationQueue.replay();
    }
  },

  /**
   * Subscribe to queue changes for UI updates
   */
  subscribe(callback: (queue: QueuedMutation[]) => void): () => void {
    subscribers.add(callback);
    callback(state.queue);
    return () => subscribers.delete(callback);
  },

  /**
   * Get current pending mutations
   */
  getPending(): QueuedMutation[] {
    return [...state.queue];
  },

  /**
   * Check if there are pending mutations
   */
  hasPending(): boolean {
    return state.queue.length > 0;
  },

  /**
   * Enqueue a mutation for offline replay
   */
  async enqueue<T>(mutation: Omit<QueuedMutation<T>, "timestamp" | "retries">): Promise<void> {
    // Check for duplicate idempotency key
    const existingIndex = state.queue.findIndex((m) => m.idempotencyKey === mutation.idempotencyKey);
    if (existingIndex >= 0) {
      // Update existing mutation with new payload (latest wins)
      state.queue[existingIndex] = {
        ...state.queue[existingIndex],
        payload: mutation.payload,
        timestamp: Date.now(),
        retries: 0,
      };
    } else {
      state.queue.push({
        ...mutation,
        timestamp: Date.now(),
        retries: 0,
      });
    }
    await saveQueue();
  },

  /**
   * Replay all queued mutations
   */
  async replay(): Promise<void> {
    if (state.isReplaying || state.queue.length === 0) return;
    state.isReplaying = true;

    // Process queue in order (oldest first)
    const queueCopy = [...state.queue];
    const remaining: QueuedMutation[] = [];

    for (const mutation of queueCopy) {
      const executor = executors.get(mutation.type);
      if (!executor) {
        console.warn(`[mutation-queue] No executor registered for type: ${mutation.type}`);
        remaining.push(mutation);
        continue;
      }

      try {
        await executor(mutation.payload);
        // Success - mutation removed from queue
      } catch (error) {
        // Increment retry count
        mutation.retries += 1;
        if (mutation.retries >= MAX_RETRIES) {
          console.error(`[mutation-queue] Max retries exceeded for ${mutation.idempotencyKey}`, error);
          // Drop mutation after max retries
        } else {
          remaining.push(mutation);
        }
      }
    }

    state.queue = remaining;
    state.isReplaying = false;
    await saveQueue();
  },

  /**
   * Remove a specific mutation by idempotency key
   */
  async remove(idempotencyKey: string): Promise<void> {
    state.queue = state.queue.filter((m) => m.idempotencyKey !== idempotencyKey);
    await saveQueue();
  },

  /**
   * Clear the entire queue (e.g., on logout)
   */
  async clear(): Promise<void> {
    state.queue = [];
    await saveQueue();
  },
};

// Auto-initialize on module load (client-side only)
if (typeof window !== "undefined") {
  // Wait for DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => void mutationQueue.init());
  } else {
    void mutationQueue.init();
  }

  // Replay on online event
  window.addEventListener("online", () => void mutationQueue.replay());
}