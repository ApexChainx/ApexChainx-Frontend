/**
 * ApexChain — Session SSE Client
 *
 * Connects to the backend SSE endpoint and listens for server-initiated
 * session events (e.g. admin-forced logout, session revocation).
 */

import { env } from "@/lib/config/env";
import { ENDPOINTS } from "@/lib/endpoints";

export type SessionRevokeReason =
  | "admin_logout"
  | "password_changed"
  | "session_expired"
  | "unknown";

export interface SessionSseEvent {
  type: "session_revoked";
  reason: SessionRevokeReason;
}

export type SseEventHandler = (event: SessionSseEvent) => void;

const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;

export interface SseConnection {
  close(): void;
}

export function connectSessionSse(onEvent: SseEventHandler): SseConnection {
  let controller: AbortController | null = null;
  let retryTimeout: ReturnType<typeof setTimeout> | null = null;
  let retryCount = 0;
  let closed = false;

  function getReconnectDelay(): number {
    const delay = Math.min(RECONNECT_BASE_MS * 2 ** retryCount, RECONNECT_MAX_MS);
    return delay * (0.75 + Math.random() * 0.5);
  }

  async function connect() {
    if (closed) return;
    controller = new AbortController();

    try {
      const baseUrl = env.API_BASE_URL.replace(/\/+$/, "");
      const response = await fetch(`${baseUrl}${ENDPOINTS.sessionEvents}`, {
        credentials: "include",
        signal: controller.signal,
        headers: {
          Accept: "text/event-stream",
          "Cache-Control": "no-cache",
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          console.warn(`[session-sse] /auth/events returned ${response.status} — closing`);
          closed = true;
          return;
        }
        console.warn(`[session-sse] /auth/events returned ${response.status} — retrying`);
        throw new Error(`SSE request failed with status ${response.status}`);
      }

      retryCount = 0;
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Response body has no readable stream");

      const decoder = new TextDecoder();
      let buffer = "";
      while (!closed) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split(/\r?\n\r?\n/);
        buffer = frames.pop() ?? "";
        for (const frame of frames) processFrame(frame, onEvent);
      }
      if (buffer.trim()) processFrame(buffer, onEvent);
    } catch {
      if (closed) return;
    }

    if (!closed) {
      retryCount++;
      retryTimeout = setTimeout(connect, getReconnectDelay());
    }
  }

  void connect();

  return {
    close() {
      closed = true;
      controller?.abort();
      if (retryTimeout) clearTimeout(retryTimeout);
      controller = null;
      retryTimeout = null;
    },
  };
}

export function processFrame(frame: string, onEvent: SseEventHandler): void {
  let eventType = "message";
  const dataLines: string[] = [];

  for (const rawLine of frame.split(/\r?\n/)) {
    if (!rawLine || rawLine.startsWith(":")) continue;
    const separator = rawLine.indexOf(":");
    const field = separator === -1 ? rawLine : rawLine.slice(0, separator);
    const value = separator === -1 ? "" : rawLine.slice(separator + 1).replace(/^ /, "");
    if (field === "event") eventType = value;
    else if (field === "data") dataLines.push(value);
  }

  if (eventType !== "session_revoked" || dataLines.length === 0) return;

  try {
    const data = JSON.parse(dataLines.join("\n")) as { reason?: string };
    const reason: SessionRevokeReason =
      data.reason === "admin_logout" || data.reason === "password_changed" || data.reason === "session_expired"
        ? data.reason
        : "unknown";
    onEvent({ type: "session_revoked", reason });
  } catch {
    // Ignore malformed event data.
  }
}
