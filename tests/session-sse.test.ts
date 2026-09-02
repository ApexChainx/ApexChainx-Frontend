/** ApexChain Network Operations Intelligence Platform */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  connectSessionSse,
  parseSessionSseFrame,
  type SessionRevokeReason,
} from "@/lib/session-sse";

describe("parseSessionSseFrame", () => {
  it("parses a single-line session_revoked frame", () => {
    expect(
      parseSessionSseFrame(
        'event: session_revoked\ndata: {"reason":"admin_logout"}\n\n',
      ),
    ).toEqual({ type: "session_revoked", reason: "admin_logout" });
  });

  it("joins multi-line data fields before JSON-parsing (SSE spec)", () => {
    expect(
      parseSessionSseFrame(
        'event: session_revoked\ndata: {"reason":\ndata: "admin_logout"}\n\n',
      ),
    ).toEqual({ type: "session_revoked", reason: "admin_logout" });
  });

  it("returns null when multi-line data does not form valid JSON", () => {
    expect(
      parseSessionSseFrame(
        'event: session_revoked\ndata: {"reason":"admin_logout"}\ndata: {"reason":"password_changed"}\n\n',
      ),
    ).toBeNull();
  });

  it("ignores malformed JSON payloads", () => {
    expect(
      parseSessionSseFrame('event: session_revoked\ndata: {"reason":\n\n'),
    ).toBeNull();
  });

  it("ignores unknown event types", () => {
    expect(
      parseSessionSseFrame('event: heartbeat\ndata: {"timestamp":1234567890}\n\n'),
    ).toBeNull();
  });

  it("ignores a session_revoked payload when the event line is missing", () => {
    expect(
      parseSessionSseFrame('data: {"reason":"session_expired"}\n\n'),
    ).toBeNull();
  });

  it.each<[string, SessionRevokeReason]>([
    ["admin_logout", "admin_logout"],
    ["password_changed", "password_changed"],
    ["session_expired", "session_expired"],
    ["not_a_known_reason", "unknown"],
  ])("maps reason %s to %s", (reason, expected) => {
    expect(
      parseSessionSseFrame(
        `event: session_revoked\ndata: {"reason":"${reason}"}\n\n`,
      ),
    ).toEqual({ type: "session_revoked", reason: expected });
  });
});

describe("connectSessionSse reconnect behavior", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("schedules a retry after a non-200 response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    const connection = connectSessionSse(() => {});

    // Flush the connect() microtask chain (fetch resolution) without
    // advancing the scheduled retry timer itself.
    await vi.advanceTimersByTimeAsync(0);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);

    connection.close();
  });

  it("stops retrying after 401 or 403 responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    vi.stubGlobal("fetch", fetchMock);

    const onEvent = vi.fn();
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    const connection = connectSessionSse(onEvent);

    await vi.advanceTimersByTimeAsync(1_000);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(setTimeoutSpy).not.toHaveBeenCalled();
    expect(onEvent).toHaveBeenCalledWith({
      type: "session_revoked",
      reason: "session_expired",
    });

    connection.close();
  });
});
