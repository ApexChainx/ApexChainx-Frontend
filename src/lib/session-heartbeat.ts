/**
 * ApexChain — Session Heartbeat Poll
 *
 * Polls `/auth/me` at a configurable interval while the page is in the
 * background (not focused). When the tab comes into focus it performs an
 * immediate check and then stops polling.
 *
 * This catches server-side session revocation within one heartbeat interval
 * even on devices / browsers that do not support SharedWorker or SSE,
 * serving as a universal fallback.
 *
 * The heartbeat uses the existing `api` client so it benefits from the
 * same auth interceptor, CSRF, and circuit-breaker logic as every other
 * request. A 401 response triggers `clearTokens()` via the interceptor,
 * which fires the `auth:logout` window event that SessionProvider listens to.
 */

import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import { logger } from "@/lib/logger";

export type HeartbeatStatus = "active" | "error";

export type HeartbeatCallback = (status: HeartbeatStatus) => void;

const DEFAULT_INTERVAL_MS = 30_000;

export interface HeartbeatHandle {
  /** Stop the heartbeat polling */
  stop(): void;
}

/**
 * Starts heartbeat polling.
 *
 * Polls `/auth/me` every `intervalMs` while the document is hidden
 * (page in background). When the document becomes visible, it fires
 * one immediate check and pauses.
 *
 * @param onStatusChange  Optional callback fired on each heartbeat result.
 * @param intervalMs      Poll interval in ms (default 30_000).
 * @returns               A handle to stop the heartbeat.
 */
export function startHeartbeat(
  onStatusChange?: HeartbeatCallback,
  intervalMs: number = DEFAULT_INTERVAL_MS,
): HeartbeatHandle {
  let timer: ReturnType<typeof setInterval> | null = null;
  let stopped = false;

  async function checkSession() {
    if (stopped) return;

    try {
      await api.get(ENDPOINTS.auth.me);
      onStatusChange?.("active");
    } catch {
      // If the request failed (e.g. network error) but the session is
      // still valid, we don't want to force a logout — only `clearTokens`
      // in the 401 interceptor will actually revoke, so we just report
      // the status.
      onStatusChange?.("error");
    }
  }

  function startPolling() {
    if (timer) clearInterval(timer);
    timer = setInterval(checkSession, intervalMs);
  }

  function stopPolling() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  /* ─── Visibility handling ─── */

  function handleVisibilityChange() {
    if (stopped) return;

    if (document.hidden) {
      // Tab is now in background — start polling
      startPolling();
    } else {
      // Tab is now in foreground — do an immediate check and stop polling
      stopPolling();
      void checkSession();
    }
  }

  /* ─── Bootstrap ─── */

  // If the page is already hidden when the heartbeat starts, begin polling.
  if (document.hidden) {
    startPolling();
  }

  document.addEventListener("visibilitychange", handleVisibilityChange);

  return {
    stop() {
      stopped = true;
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    },
  };
}
