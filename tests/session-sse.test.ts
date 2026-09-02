/** ApexChain Network Operations Intelligence Platform */
/**
 * Session SSE client tests.
 *
 * `processFrame(frame, onEvent)` was renamed to the pure parser
 * `parseSessionSseFrame(frame)` returning the event or null; the tests below
 * target the current API.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { connectSessionSse, parseSessionSseFrame } from "@/lib/session-sse";

describe("parseSessionSseFrame", () => {
  it("parses a single-line session_revoked frame", () => {
    expect(
      parseSessionSseFrame('event: session_revoked\ndata: {"reason":"admin_logout"}\n\n'),
    ).toEqual({ type: "session_revoked", reason: "admin_logout" });
  });

  it("joins multi-line data fields with newlines (keeps truncation behavior)", () => {
    // A multi-line `data:` field is joined with \n, which makes the JSON
    // payload unparseable — the frame must be ignored, not crash.
    expect(
      parseSessionSseFrame(
        'event: session_revoked\ndata: {"reason":"admin_logout"}\ndata: {"reason":"password_changed"}\n\n',
      ),
    ).toBeNull();
  });

  it("ignores malformed JSON payloads", () => {
    expect(parseSessionSseFrame('event: session_revoked\ndata: {"reason":\n\n')).toBeNull();
  });

  it("ignores unknown event types", () => {
    expect(parseSessionSseFrame('event: heartbeat\ndata: {"timestamp":1234567890}\n\n')).toBeNull();
  });

  it("ignores a session_revoked payload when the event line is missing", () => {
    expect(parseSessionSseFrame('data: {"reason":"session_expired"}\n\n')).toBeNull();
  });

  it.each([
    ["admin_logout", "admin_logout"],
    ["password_changed", "password_changed"],
    ["session_expired", "session_expired"],
    ["not_a_known_reason", "unknown"],
  ])("maps reason %s to %s", (reason, expected) => {
    expect(
      parseSessionSseFrame(`event: session_revoked\ndata: {"reason":"${reason}"}\n\n`),
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
  });

  it("schedules a retry after a transient non-200 response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    });
    vi.stubGlobal("fetch", fetchMock);
    // Pin the jitter (±25%) added to the backoff delay.
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const connection = connectSessionSse(() => {});

    // Let the async connect() body reach the reconnect scheduling.
    await vi.advanceTimersByTimeAsync(0);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    // Base delay 1s * 2^0 with jitter factor 0.75 + 0.5 * 0.5 = 1.0 → 1000ms.
    connection.close();
  });

  it("reconnects and retries the fetch on a transient failure", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const connection = connectSessionSse(() => {});
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Advance past the scheduled backoff — a second attempt must happen.
    // retryCount is incremented before computing the delay, so the first
    // retry lands at base * 2^1 * jitter = 2000ms.
    await vi.advanceTimersByTimeAsync(2_100);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    connection.close();
  });

  it("stops retrying after 401 or 403 responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    });
    vi.stubGlobal("fetch", fetchMock);

    const onEvent = vi.fn();
    const connection = connectSessionSse(onEvent);

    await vi.advanceTimersByTimeAsync(0);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    // A definitive 401 means the session is gone: surface revocation…
    expect(onEvent).toHaveBeenCalledWith({
      type: "session_revoked",
      reason: "session_expired",
    });

    // …and never schedule another attempt.
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    connection.close();
  });
});
