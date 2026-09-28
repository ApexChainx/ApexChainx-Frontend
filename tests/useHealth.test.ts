/** ApexChain Frontend Test Suite */
/**
 * Issue #604 — `useHealth` polled every 30 seconds unconditionally, so a
 * backgrounded tab kept spending request budget on a badge nobody was
 * looking at. These tests drive the real `visibilitychange` event and assert
 * the loop is torn down while hidden and reconciled immediately on return.
 */
import { act, renderHook } from "@testing-library/react";
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
