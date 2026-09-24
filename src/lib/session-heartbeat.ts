/**
 * ApexChain — Session Heartbeat Poll
 *
 * Polls `/auth/me` at a configurable interval while the page is in the
 * background (not focused). While the tab is visible it also polls, but at a
 * much lower cadence, and it fires an immediate check whenever the document
 * becomes visible again.
 *
 * This catches server-side session revocation within one heartbeat interval
 * even on devices / browsers that do not support SharedWorker or SSE,
 * serving as a universal fallback.
 *
 * Issue #521 — an operator parked on a cached/offline-first view (outages list
 * hydrated from the persisted cache) does not punch the API on every
 * interaction, so a hidden-only heartbeat could leave a visible tab signed in
 * long after the session was revoked server-side. The visible-tab cadence
 * (5 minutes by default) bounds how stale a visible tab can get, and the
 * `visibilitychange` immediate check covers the common "tab switched back"
 * moment.
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

/** Poll cadence while the tab is in the background. */
const HIDDEN_INTERVAL_MS = 30_000;

/** Low-frequency poll cadence while the tab is visible (issue #521). */
const VISIBLE_INTERVAL_MS = 5 * 60_000;

export interface HeartbeatHandle {
  /** Stop the heartbeat polling */
  stop(): void;
}

/**
 * Starts heartbeat polling.
 *
 * Polls `/auth/me` every `visibleIntervalMs` while the document is visible
 * and every `hiddenIntervalMs` while it is hidden, with an immediate check on
 * every `visibilitychange` back to visible.
 *
 * @param onStatusChange      Optional callback fired on each heartbeat result.
 * @param visibleIntervalMs   Visible-tab poll interval in ms (default 5 min).
 * @param hiddenIntervalMs    Hidden-tab poll interval in ms (default 30 s).
 * @returns                   A handle to stop the heartbeat.
 */
export function startHeartbeat(
  onStatusChange?: HeartbeatCallback,
  visibleIntervalMs: number = VISIBLE_INTERVAL_MS,
  hiddenIntervalMs: number = HIDDEN_INTERVAL_MS,
): HeartbeatHandle {
  let timer: ReturnType<typeof setInterval> | null = null;
  let stopped = false;
  let lastCheck: Promise<void> | null = null;

  async function checkSession() {
    if (stopped) return;

    // Guard against overlapping checks when the interval fires while a
    // previous check is still in flight.
    if (lastCheck) {
      await lastCheck.catch(() => undefined);
    }

    const current = (async () => {
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
    })();

    lastCheck = current;
    await current.catch(() => undefined);
    if (lastCheck === current) lastCheck = null;
  }

  function startPolling(intervalMs: number) {
    if (timer) clearInterval(timer);
    timer = setInterval(() => void checkSession(), intervalMs);
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
      // Tab is now in background — poll at the hidden cadence.
      startPolling(hiddenIntervalMs);
    } else {
      // Tab is now in foreground — poll at the low visible cadence AND run
      // an immediate check so a revocation is caught right away.
      startPolling(visibleIntervalMs);
      void checkSession();
    }
  }

  /* ─── Bootstrap ─── */

  // If the page is already hidden when the heartbeat starts, poll at the
  // hidden cadence; otherwise poll at the low visible cadence (issue #521).
  startPolling(document.hidden ? hiddenIntervalMs : visibleIntervalMs);

  document.addEventListener("visibilitychange", handleVisibilityChange);

  return {
    stop() {
      stopped = true;
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    },
  };
}