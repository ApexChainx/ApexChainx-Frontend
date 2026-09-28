/** ApexChain Frontend Test Suite */
/**
 * Issue #608 — `useStellarHealth` owns a 30s Horizon poller and a 5s request
 * timeout, but nothing asserted that the interval is torn down, that a
 * backgrounded tab stops pinging Horizon, or that a hung request is
 * abandoned. Timer leaks and doubled pollers only show up in production as
 * slow memory growth and doubled network traffic, so they are pinned here.
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/config/env", () => ({
  env: { STELLAR_HORIZON_URL: "https://horizon.test" },
}));

import { useStellarHealth } from "@/hooks/useStellarHealth";

const POLL_INTERVAL_MS = 30_000;
const TIMEOUT_MS = 5_000;

const fetchMock = vi.fn();

/** jsdom exposes `document.hidden` as a getter; override it per test. */
function setDocumentHidden(hidden: boolean) {
  Object.defineProperty(document, "hidden", {
    configurable: true,
    get: () => hidden,
  });
}

function fireVisibilityChange() {
  document.dispatchEvent(new Event("visibilitychange"));
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

function okResponse() {
  return { ok: true, status: 200 };
}

describe("useStellarHealth polling (#608)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setDocumentHidden(false);
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(okResponse());
    // Re-stubbed per test: `afterEach` unstubs it so a jsdom test cannot leak
    // the mock into another file.
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    setDocumentHidden(false);
    vi.unstubAllGlobals();
  });

  it("pings Horizon on mount and reports reachable with a latency reading", async () => {
    const { result } = renderHook(() => useStellarHealth());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![0]).toBe("https://horizon.test");

    await act(async () => {});

    expect(result.current.status).toBe("reachable");
    expect(typeof result.current.latencyMs).toBe("number");
    expect(result.current.lastChecked).toBeInstanceOf(Date);
  });

  it("stops polling while hidden and reconciles immediately on return", async () => {
    renderHook(() => useStellarHealth());
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await advance(POLL_INTERVAL_MS);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    act(() => {
      setDocumentHidden(true);
      fireVisibilityChange();
    });

    await advance(POLL_INTERVAL_MS * 5);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    act(() => {
      setDocumentHidden(false);
      fireVisibilityChange();
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);

    await advance(POLL_INTERVAL_MS);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("tears the interval down on unmount", async () => {
    const { unmount } = renderHook(() => useStellarHealth());
    expect(fetchMock).toHaveBeenCalledTimes(1);

    unmount();
    await advance(POLL_INTERVAL_MS * 4);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps a single poller across a rapid re-mount", async () => {
    const first = renderHook(() => useStellarHealth());
    first.unmount();
    const second = renderHook(() => useStellarHealth());

    await advance(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // One interval belongs to the surviving mount only.
    await advance(POLL_INTERVAL_MS);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    await advance(POLL_INTERVAL_MS);
    expect(fetchMock).toHaveBeenCalledTimes(4);

    second.unmount();
  });

  it("reports unreachable when Horizon rejects", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() => useStellarHealth());
    await act(async () => {});

    expect(result.current.status).toBe("unreachable");
    expect(result.current.latencyMs).toBeNull();
  });

  it("reports unreachable when Horizon answers with an error status", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503 });

    const { result } = renderHook(() => useStellarHealth());
    await act(async () => {});

    expect(result.current.status).toBe("unreachable");
    expect(result.current.latencyMs).toBeNull();
  });

  it("abandons a hung request once the timeout elapses", async () => {
    fetchMock.mockImplementation(
      (_url: string, init?: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new Error("aborted")),
          );
        }),
    );

    const { result } = renderHook(() => useStellarHealth());
    await act(async () => {});

    // Still in flight: the state has not been written yet.
    expect(result.current.status).toBe("checking");

    await advance(TIMEOUT_MS + 1);

    expect(result.current.status).toBe("unreachable");
    expect(result.current.latencyMs).toBeNull();
  });
});
