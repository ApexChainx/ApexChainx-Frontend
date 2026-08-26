import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { processFrame, connectSessionSse } from "@/lib/session-sse";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("session SSE", () => {
  it("recognizes heartbeat frames without dispatching them", () => {
    const handler = vi.fn();
    processFrame("event: heartbeat\ndata: {\"timestamp\":123}", handler);
    expect(handler).not.toHaveBeenCalled();

    processFrame("event: session_revoked\ndata: {\"reason\":\"admin_logout\"}", handler);
    expect(handler).toHaveBeenCalledWith({ type: "session_revoked", reason: "admin_logout" });
  });

  it("does not reconnect after a 401 response", async () => {
    vi.useFakeTimers();
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 401 }));
    connectSessionSse(vi.fn());
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
