/**
 * ApexChain — Session Sync
 *
 * Abstraction over cross-tab session synchronisation.
 * Uses SharedWorker when available, falls back to BroadcastChannel.
 *
 * The worker/channel acts purely as an event bus — no tokens are stored
 * or exposed to other tabs beyond the minimal session-enum messages.
 *
 * Message types:
 *   { type: "logout" }
 *   { type: "authenticated"; user: SessionUser }
 */

import type { SessionUser } from "@/types/session";

export type SessionSyncMessage =
  | { type: "logout" }
  | { type: "authenticated"; user: SessionUser };

type MessageHandler = (msg: SessionSyncMessage) => void;

const CHANNEL_NAME = "apexchain_session";
const WORKER_URL = "/session-worker.js";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export interface SessionSync {
  postMessage(msg: SessionSyncMessage): void;
  setHandler(handler: MessageHandler | null): void;
  close(): void;
}

/**
 * Creates a SharedWorker-based session sync, falling back to BroadcastChannel
 * when SharedWorker is unavailable (e.g. in iframes or older browsers).
 * Returns null in non-browser environments (SSR).
 */
export function createSessionSync(): SessionSync | null {
  if (!isBrowser()) return null;

  // Try SharedWorker first — it survives individual tab closures and is
  // generally more reliable than BroadcastChannel.
  if (typeof SharedWorker !== "undefined") {
    try {
      return createWorkerSync();
    } catch {
      // Worker URL may fail to load in some environments; fall through.
    }
  }

  // Fallback to BroadcastChannel
  if (typeof BroadcastChannel !== "undefined") {
    try {
      return createChannelSync();
    } catch {
      return null;
    }
  }

  return null;
}

/* ─── SharedWorker implementation ─── */

function createWorkerSync(): SessionSync {
  const worker = new SharedWorker(WORKER_URL);
  const port = worker.port;

  let handler: MessageHandler | null = null;

  port.onmessage = (event: MessageEvent<SessionSyncMessage>) => {
    handler?.(event.data);
  };

  port.start();

  return {
    postMessage(msg) {
      port.postMessage(msg);
    },
    setHandler(h) {
      handler = h;
    },
    close() {
      port.close();
      worker.port.close();
    },
  };
}

/* ─── BroadcastChannel fallback ─── */

function createChannelSync(): SessionSync {
  const channel = new BroadcastChannel(CHANNEL_NAME);

  let handler: MessageHandler | null = null;

  channel.onmessage = (event: MessageEvent<SessionSyncMessage>) => {
    handler?.(event.data);
  };

  return {
    postMessage(msg) {
      channel.postMessage(msg);
    },
    setHandler(h) {
      handler = h;
    },
    close() {
      channel.close();
    },
  };
}
