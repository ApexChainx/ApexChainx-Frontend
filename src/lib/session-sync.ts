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
 *
 * Issue #524 — when SharedWorker is unavailable (older browsers, in-app
 * webviews, SSR), coordination degrades to BroadcastChannel-only. That still
 * propagates logout/authenticated messages between live tabs, but a tab that
 * is closed misses messages entirely (BroadcastChannel has no persistence).
 * To bound that window the provider additionally broadcasts the current
 * session at a low cadence whenever the fallback is engaged, so a tab that
 * missed a one-off message still converges to the latest session state.
 * The fallback transition is surfaced with a one-time dev-only warning so the
 * degradation is never silent.
 */

import type { SessionUser } from "@/types/session";
import { logger } from "@/lib/logger";

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
  /**
   * True when the sync is running on the BroadcastChannel-only fallback
   * (SharedWorker missing or failed). The provider uses this to enable its
   * low-cadence session beacon (issue #524).
   */
  usesWorkerFallback: boolean;
}

let fallbackWarned = false;

function warnOnce(message: string) {
  // Dev-only (issue #524): surfacing the degradation in production would be
  // noise for every user on a webview/legacy browser, and we only emit the
  // warning once per page load.
  if (fallbackWarned || process.env.NODE_ENV === "production") return;
  fallbackWarned = true;
  logger.warn(message, {
    workerUrl: WORKER_URL,
    channelName: CHANNEL_NAME,
  });
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
      warnOnce("session-sync: SharedWorker unavailable, using BroadcastChannel fallback");
      return createChannelSync();
    } catch {
      warnOnce("session-sync: BroadcastChannel unavailable, session sync disabled");
      return null;
    }
  }

  warnOnce("session-sync: no cross-tab channel available, session sync disabled");
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
    usesWorkerFallback: false,
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
    usesWorkerFallback: true,
  };
}