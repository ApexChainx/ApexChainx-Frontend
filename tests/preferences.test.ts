import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGet, mockPut } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPut: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    put: (...args: unknown[]) => mockPut(...args),
  },
}));

import {
  getPreferences,
  hasPendingPreferenceSync,
  hydratePreferences,
  resetPreferences,
  subscribeToPreferences,
  updatePreferences,
} from "@/lib/preferences";

const key = "apexchain_user_preferences";

/** Axios error shaped like a real 401/403/5xx rejection. */
function apiError(status: number) {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status, data: {} },
  });
}

describe("preferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    resetPreferences();
    mockGet.mockReset();
    mockPut.mockReset();
  });

  it("hydrates with server values winning", async () => {
    localStorage.setItem(key, JSON.stringify({ tableDensity: "compact", onboardingTourDone: false }));
    mockGet.mockResolvedValue({ data: { tableDensity: "comfortable" } });
    await expect(hydratePreferences()).resolves.toEqual({
      tableDensity: "comfortable",
      onboardingTourDone: false,
    });
  });

  it("falls back to local preferences when hydration fails", async () => {
    localStorage.setItem(key, JSON.stringify({ tableDensity: "compact" }));
    mockGet.mockRejectedValue(new Error("offline"));
    await expect(hydratePreferences()).resolves.toEqual({ tableDensity: "compact" });
  });

  it("hydrates only once until reset", async () => {
    mockGet.mockResolvedValue({ data: { tableDensity: "compact" } });
    await hydratePreferences();
    await hydratePreferences();
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it("updates local state and syncs the server", async () => {
    mockPut.mockResolvedValue({ data: {} });
    await expect(updatePreferences({ tableDensity: "compact" })).resolves.toEqual({
      tableDensity: "compact",
    });
    expect(getPreferences()).toEqual({ tableDensity: "compact" });
    expect(mockPut).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ tableDensity: "compact" }));
  });

  it("keeps local changes when server update fails transiently", async () => {
    mockPut.mockRejectedValue(new Error("offline"));
    await updatePreferences({ tableDensity: "compact" });
    expect(getPreferences()).toEqual({ tableDensity: "compact" });
  });

  it("queues a failed transient sync and replays it on the next update (#293)", async () => {
    mockPut.mockRejectedValueOnce(new Error("offline"));
    await updatePreferences({ tableDensity: "compact" });
    expect(hasPendingPreferenceSync()).toBe(true);

    // The backend is back — the next update flushes the queued write first,
    // then lands the newest state so it wins on the server.
    mockPut.mockResolvedValue({ data: {} });
    await updatePreferences({ tableDensity: "comfortable" });

    expect(mockPut).toHaveBeenCalledTimes(2);
    expect(mockPut).toHaveBeenNthCalledWith(1, expect.any(String), { tableDensity: "compact" });
    expect(mockPut).toHaveBeenLastCalledWith(expect.any(String), { tableDensity: "comfortable" });
    expect(hasPendingPreferenceSync()).toBe(false);
  });

  it("does not queue a sync that failed with a definitive auth error (#293)", async () => {
    mockPut.mockRejectedValue(apiError(401));
    await updatePreferences({ tableDensity: "compact" });
    expect(hasPendingPreferenceSync()).toBe(false);
  });

  it("replays queued syncs after hydration succeeds (#293)", async () => {
    mockPut.mockRejectedValueOnce(new Error("offline"));
    await updatePreferences({ columnVisibility: { severity: true } });
    expect(hasPendingPreferenceSync()).toBe(true);

    mockGet.mockResolvedValue({ data: {} });
    await hydratePreferences();

    // 2 calls: the original (rejected) PUT plus the replayed one from the
    // post-hydration flush.
    expect(mockPut).toHaveBeenCalledTimes(2);
    expect(mockPut).toHaveBeenLastCalledWith(expect.any(String), {
      columnVisibility: { severity: true },
    });
    expect(hasPendingPreferenceSync()).toBe(false);
  });

  it("notifies subscribers and supports unsubscribe", async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToPreferences(listener);
    expect(listener).toHaveBeenCalledWith({});
    await updatePreferences({ tableDensity: "compact" });
    expect(listener).toHaveBeenLastCalledWith({ tableDensity: "compact" });
    unsubscribe();
    await updatePreferences({ tableDensity: "comfortable" });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("resets memory, storage, hydration, and subscribers", async () => {
    const listener = vi.fn();
    subscribeToPreferences(listener);
    await updatePreferences({ tableDensity: "compact" });
    resetPreferences();
    expect(getPreferences()).toEqual({});
    expect(localStorage.getItem(key)).toBeNull();
    expect(listener).toHaveBeenLastCalledWith({});
  });

  it("clears the pending queue on reset so a logout never replays the previous user's writes", async () => {
    mockPut.mockRejectedValue(new Error("offline"));
    await updatePreferences({ tableDensity: "compact" });
    expect(hasPendingPreferenceSync()).toBe(true);

    resetPreferences();
    expect(hasPendingPreferenceSync()).toBe(false);
  });
});
