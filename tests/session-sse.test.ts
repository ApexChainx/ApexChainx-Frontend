/** ApexChain Network Operations Intelligence Platform */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { connectSessionSse, processFrame } from "@/lib/session-sse";

describe("processFrame", () => {
  const onEvent = vi.fn();

  beforeEach(() => {
    onEvent.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("handles a single-line session_revoked frame", () => {
    processFrame(
      'event: session_revoked\ndata: {"reason":"admin_logout"}\n\n',
      onEvent,
    );

    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(onEvent).toHaveBeenCalledWith({
      type: "session_revoked",
      reason: "admin_logout",
    });
  });

  it("keeps the current multi-line data truncation behavior", () => {
    processFrame(
      'event: session_revoked\ndata: {"reason":"admin_logout"}\ndata: {"reason":"password_changed"}\n\n',
      onEvent,
    );

    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(onEvent).toHaveBeenCalledWith({
      type: "session_revoked",
      reason: "password_changed",
    });
  });

  it("ignores malformed JSON payloads", () => {
    processFrame('event: session_revoked\ndata: {"reason":\n\n', onEvent);

    expect(onEvent).not.toHaveBeenCalled();
  });

  it("ignores unknown event types", () => {
    processFrame('event: heartbeat\ndata: {"timestamp":1234567890}\n\n', onEvent);

    expect(onEvent).not.toHaveBeenCalled();
  });

  it("ignores a session_revoked payload when the event line is missing", () => {
    processFrame('data: {"reason":"session_expired"}\n\n', onEvent);

    expect(onEvent).not.toHaveBeenCalled();
  });

  it.each([
    ["admin_logout", "admin_logout"],
    ["password_changed", "password_changed"],
    ["session_expired", "session_expired"],
    ["not_a_known_reason", "unknown"],
  ])("maps reason %s to %s", (reason, expected) => {
    processFrame(
      `event: session_revoked\ndata: {"reason":"${reason}"}\n\n`,
      onEvent,
    );

    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(onEvent).toHaveBeenCalledWith({
      type: "session_revoked",
      reason: expected,
    });
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

  it("schedules a retry after a non-200 response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    const connection = connectSessionSse(() => {});

    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), expect.any(Number));

    connection.close();
  });

  it("stops retrying after 401 or 403 responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    });
    vi.stubGlobal("fetch", fetchMock);

    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    const connection = connectSessionSse(() => {});

    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(1_000);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(setTimeoutSpy).not.toHaveBeenCalled();

    connection.close();
  });
});
