import { act, renderHook } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { onlineManager } from "@tanstack/react-query";
import { useHealth } from "@/hooks/useHealth";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/lib/api", () => ({ api: { get } }));

describe("useHealth", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    get.mockReset();
    vi.spyOn(onlineManager, "setOnline");
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("keeps React Query online when the backend health endpoint fails", async () => {
    get.mockRejectedValue(new Error("server unavailable"));
    renderHook(() => useHealth());
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(onlineManager.setOnline).toHaveBeenCalledWith(true);
    expect(onlineManager.setOnline).not.toHaveBeenCalledWith(false);
  });

  it("checks health again after the browser comes back online", async () => {
    get.mockResolvedValue({ data: {} });
    renderHook(() => useHealth());
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(get).toHaveBeenCalledTimes(1);

    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    act(() => { window.dispatchEvent(new Event("offline")); });
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
    act(() => { window.dispatchEvent(new Event("online")); });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(get).toHaveBeenCalledTimes(2);
  });
});
