/** ApexChain Network Operations Intelligence Platform */
/** Tests for useHealth: asserts that every declared HealthStatus is reachable. */
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useHealth } from "@/hooks/useHealth";

const mockGet = vi.fn();
const mockSetOnline = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

vi.mock("@tanstack/react-query", () => ({
  onlineManager: {
    setOnline: (...args: unknown[]) => mockSetOnline(...args),
  },
}));

function apiError(status: number) {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status, data: {} },
  });
}

describe("useHealth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockReset();
    mockSetOnline.mockReset();
    // Default to online so the health poll actually runs.
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  });

  it("starts green while online and health succeeds", async () => {
    mockGet.mockResolvedValue({ status: 200 });
    const { result } = renderHook(() => useHealth());

    expect(result.current.status).toBe("green");

    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    await waitFor(() => expect(result.current.status).toBe("green"));
    expect(result.current.isOffline).toBe(false);
  });

  it("turns red when the health endpoint fails", async () => {
    mockGet.mockRejectedValue(apiError(503));
    const { result } = renderHook(() => useHealth());

    expect(result.current.status).toBe("green");

    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    await waitFor(() => expect(result.current.status).toBe("red"));
    expect(result.current.isOffline).toBe(true);
  });

  it("turns red when the browser goes offline", async () => {
    mockGet.mockResolvedValue({ status: 200 });
    const { result } = renderHook(() => useHealth());

    await waitFor(() => expect(result.current.status).toBe("green"));

    // Flip the navigator online flag then dispatch the offline event.
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    expect(result.current.status).toBe("red");
    expect(result.current.isOffline).toBe(true);
  });

  it("only ever reports a state in the declared HealthStatus set", async () => {
    // Regression guard: the hook must never emit "yellow" (the removed dead state).
    const declared: readonly string[] = ["green", "red"];
    mockGet.mockResolvedValueOnce({ status: 200 }).mockRejectedValueOnce(apiError(500));
    const { result } = renderHook(() => useHealth());

    expect(declared.includes(result.current.status)).toBe(true);

    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    await waitFor(() => expect(result.current.status).toBe("green"));
    expect(declared.includes(result.current.status)).toBe(true);
  });
});
