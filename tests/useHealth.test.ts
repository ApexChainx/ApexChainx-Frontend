/** ApexChain Frontend Test Suite */
/**
 * Issue #604 — `useHealth` polled every 30 seconds unconditionally, so a
 * backgrounded tab kept spending request budget on a badge nobody was
 * looking at. These tests drive the real `visibilitychange` event and assert
 * the loop is torn down while hidden and reconciled immediately on return.
 */
import { act, renderHook } from "@testing-library/react";
import { onlineManager } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGet = vi.fn();

vi.mock("@/lib/api", () => ({
  api: { get: (...args: unknown[]) => mockGet(...args) },
}));

import { useHealth } from "@/hooks/useHealth";

const INTERVAL_MS = 30_000;

/** jsdom exposes `document.hidden` as a getter; override it per test. */
function setDocumentHidden(hidden: boolean) {
  Object.defineProperty(document, "hidden", {
    configurable: true,
    get: () => hidden,
  });
}

function setOnline(online: boolean) {
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    get: () => online,
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

describe("useHealth visibility gating (#604)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setDocumentHidden(false);
    setOnline(true);
    mockGet.mockReset();
    mockGet.mockResolvedValue({ data: { status: "ok" } });
  });

  afterEach(() => {
    vi.useRealTimers();
    setDocumentHidden(false);
    setOnline(true);
  });

  it("checks once on mount and then once per interval", async () => {
    renderHook(() => useHealth());

    expect(mockGet).toHaveBeenCalledTimes(1);

    await advance(INTERVAL_MS);
    expect(mockGet).toHaveBeenCalledTimes(2);

    await advance(INTERVAL_MS);
    expect(mockGet).toHaveBeenCalledTimes(3);
  });

  it("stops polling while the document is hidden and resumes on return", async () => {
    renderHook(() => useHealth());
    expect(mockGet).toHaveBeenCalledTimes(1);

    await advance(INTERVAL_MS * 2);
    expect(mockGet).toHaveBeenCalledTimes(3);

    // Background the tab: the interval must be cleared, not merely ignored.
    act(() => {
      setDocumentHidden(true);
      fireVisibilityChange();
    });

    await advance(INTERVAL_MS * 6);
    expect(mockGet).toHaveBeenCalledTimes(3);

    // Returning to the foreground reconciles immediately, then resumes the
    // normal cadence.
    act(() => {
      setDocumentHidden(false);
      fireVisibilityChange();
    });
    expect(mockGet).toHaveBeenCalledTimes(4);

    await advance(INTERVAL_MS);
    expect(mockGet).toHaveBeenCalledTimes(5);
  });

  it("does not ping the backend while the browser is offline", async () => {
    setOnline(false);

    renderHook(() => useHealth());

    expect(mockGet).not.toHaveBeenCalled();

    await advance(INTERVAL_MS * 3);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("surfaces a red status when the health check fails", async () => {
    mockGet.mockRejectedValueOnce(new Error("backend down"));

    const { result } = renderHook(() => useHealth());
    await act(async () => {});

    expect(result.current.status).toBe("red");
  });
});

/**
 * Issue #608 — timer cleanup, duplicate-subscription guards, and online-manager
 * coordination for the health heartbeat. A leaked interval is invisible until
 * it shows up as doubled backend traffic, so each teardown path is pinned.
 */
describe("useHealth cleanup and online coordination (#608)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setDocumentHidden(false);
    setOnline(true);
    mockGet.mockReset();
    mockGet.mockResolvedValue({ data: { status: "ok" } });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    setDocumentHidden(false);
    setOnline(true);
  });

  it("tears the interval and the connectivity listeners down on unmount", async () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = renderHook(() => useHealth());
    expect(mockGet).toHaveBeenCalledTimes(1);

    unmount();
    await advance(INTERVAL_MS * 3);

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledWith("online", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("offline", expect.any(Function));
  });

  it("keeps a single heartbeat across a rapid re-mount", async () => {
    const first = renderHook(() => useHealth());
    first.unmount();

    const second = renderHook(() => useHealth());
    expect(mockGet).toHaveBeenCalledTimes(2);

    // One interval belongs to the surviving mount: two ticks, not four.
    await advance(INTERVAL_MS);
    expect(mockGet).toHaveBeenCalledTimes(3);

    await advance(INTERVAL_MS);
    expect(mockGet).toHaveBeenCalledTimes(4);

    second.unmount();
  });

  it("does not stack a second request while one is still in flight", async () => {
    let resolveRequest: (value: unknown) => void = () => {};
    mockGet.mockImplementation(
      () => new Promise((resolve) => { resolveRequest = resolve; }),
    );

    renderHook(() => useHealth());
    expect(mockGet).toHaveBeenCalledTimes(1);

    // Three intervals pass while the first check hangs: the in-flight guard
    // must swallow every tick instead of queueing up duplicates.
    await advance(INTERVAL_MS * 3);
    expect(mockGet).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveRequest({ data: { status: "ok" } });
    });

    await advance(INTERVAL_MS);
    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it("drives onlineManager from connectivity events and pings immediately on reconnect", async () => {
    const setOnlineSpy = vi.spyOn(onlineManager, "setOnline");

    renderHook(() => useHealth());
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(setOnlineSpy).toHaveBeenLastCalledWith(true);

    await advance(INTERVAL_MS);
    expect(mockGet).toHaveBeenCalledTimes(2);

    // Losing connectivity parks React Query's online manager and stops the
    // heartbeat from producing guaranteed failures.
    act(() => {
      setOnline(false);
      window.dispatchEvent(new Event("offline"));
    });
    expect(setOnlineSpy).toHaveBeenLastCalledWith(false);

    await advance(INTERVAL_MS * 2);
    expect(mockGet).toHaveBeenCalledTimes(2);

    // Reconnecting flips the manager back and reconciles immediately.
    act(() => {
      setOnline(true);
      window.dispatchEvent(new Event("online"));
    });
    expect(setOnlineSpy).toHaveBeenLastCalledWith(true);
    expect(mockGet).toHaveBeenCalledTimes(3);

    await advance(INTERVAL_MS);
    expect(mockGet).toHaveBeenCalledTimes(4);
  });

  it("survives repeated online/offline flapping without leaking subscriptions", async () => {
    const setOnlineSpy = vi.spyOn(onlineManager, "setOnline");

    renderHook(() => useHealth());
    expect(mockGet).toHaveBeenCalledTimes(1);

    for (let i = 0; i < 5; i += 1) {
      act(() => {
        setOnline(false);
        window.dispatchEvent(new Event("offline"));
      });
      act(() => {
        setOnline(true);
        window.dispatchEvent(new Event("online"));
      });
    }

    // Every flap reached React Query's online manager...
    expect(setOnlineSpy).toHaveBeenCalledWith(false);
    expect(setOnlineSpy).toHaveBeenLastCalledWith(true);

    await act(async () => {});

    // ...but the flapping did not leave one timer per event behind: the
    // steady state is still exactly one check per interval.
    const afterFlapping = mockGet.mock.calls.length;
    await advance(INTERVAL_MS);
    expect(mockGet.mock.calls.length - afterFlapping).toBe(1);

    await advance(INTERVAL_MS);
    expect(mockGet.mock.calls.length - afterFlapping).toBe(2);
  });
});
