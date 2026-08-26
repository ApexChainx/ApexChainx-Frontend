/**
 * ApexChain — Network Operations Intelligence Platform
 * Unit tests for src/lib/preferences.ts
 *
 * Covers the server-wins merge in hydratePreferences, the isHydrated gate,
 * the subscriber notification contract, updatePreferences sync, reset, and
 * the localStorage failure fallbacks.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the module's only transport (apiClient) and its endpoints dependency.
const apiClientMock = vi.fn();

vi.mock("@/lib/client", () => ({
  apiClient: (...args: unknown[]) => apiClientMock(...args),
}));

// preferences.ts keeps module-level state (isHydrated / currentPreferences /
// subscribers). Re-import it fresh per test so state never leaks across cases.
async function loadPreferences() {
  return import("@/lib/preferences");
}

type PrefModule = Awaited<ReturnType<typeof loadPreferences>>;

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  localStorage.clear();
});

describe("hydratePreferences", () => {
  it("merges local and remote with server winning on key conflicts", async () => {
    localStorage.setItem(
      "apexchain_user_preferences",
      JSON.stringify({ tableDensity: "compact", onboardingTourDone: false }),
    );
    apiClientMock.mockResolvedValue({
      tableDensity: "comfortable",
      outageFilterPresets: [{ name: "Severe" }],
    });

    const { hydratePreferences, getPreferences } = await loadPreferences();
    const result = await hydratePreferences();

    // Server wins on tableDensity; local-only key preserved; new remote key added.
    expect(result).toEqual({
      tableDensity: "comfortable",
      onboardingTourDone: false,
      outageFilterPresets: [{ name: "Severe" }],
    });
    expect(apiClientMock).toHaveBeenCalledWith("/user/preferences", {
      method: "GET",
    });
    // Merged result is persisted back to localStorage.
    expect(JSON.parse(localStorage.getItem("apexchain_user_preferences")!)).toEqual(
      result,
    );
    expect(getPreferences()).toEqual(result);
  });

  it("is a no-op after the first successful hydration (isHydrated gate)", async () => {
    apiClientMock.mockResolvedValue({ tableDensity: "comfortable" });

    const { hydratePreferences } = await loadPreferences();
    await hydratePreferences();
    await hydratePreferences();

    // Only one fetch — the gate prevents a second hydration.
    expect(apiClientMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to localStorage when the server fetch fails", async () => {
    localStorage.setItem(
      "apexchain_user_preferences",
      JSON.stringify({ tableDensity: "compact" }),
    );
    apiClientMock.mockRejectedValue(new Error("network down"));

    const { hydratePreferences } = await loadPreferences();
    const result = await hydratePreferences();

    expect(result).toEqual({ tableDensity: "compact" });
    // Failure must not throw.
    expect(apiClientMock).toHaveBeenCalledTimes(1);
  });

  it("returns an empty object on failure when localStorage is empty", async () => {
    apiClientMock.mockRejectedValue(new Error("network down"));

    const { hydratePreferences } = await loadPreferences();
    const result = await hydratePreferences();

    expect(result).toEqual({});
  });

  it("notifies subscribers with the hydrated preferences", async () => {
    apiClientMock.mockResolvedValue({ tableDensity: "comfortable" });
    const subscriber = vi.fn();

    const { hydratePreferences, subscribeToPreferences } = await loadPreferences();
    subscribeToPreferences(subscriber);
    await hydratePreferences();

    expect(subscriber).toHaveBeenLastCalledWith({
      tableDensity: "comfortable",
    });
  });

  it("recovers malformed JSON in localStorage without throwing", async () => {
    localStorage.setItem("apexchain_user_preferences", "{not json");
    apiClientMock.mockResolvedValue({ tableDensity: "comfortable" });

    const { hydratePreferences } = await loadPreferences();
    const result = await hydratePreferences();

    expect(result).toEqual({ tableDensity: "comfortable" });
  });
});

describe("updatePreferences", () => {
  it("merges partial preferences into current state and persists to localStorage", async () => {
    apiClientMock.mockResolvedValue({ tableDensity: "comfortable" });

    const { hydratePreferences, updatePreferences } = await loadPreferences();
    await hydratePreferences();
    await updatePreferences({ onboardingTourDone: true });

    expect(JSON.parse(localStorage.getItem("apexchain_user_preferences")!)).toEqual({
      tableDensity: "comfortable",
      onboardingTourDone: true,
    });
  });

  it("sends the merged preferences to the server via PUT", async () => {
    apiClientMock.mockResolvedValue({});

    const { updatePreferences } = await loadPreferences();
    await updatePreferences({ tableDensity: "compact" });

    expect(apiClientMock).toHaveBeenCalledWith("/user/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableDensity: "compact" }),
    });
  });

  it("swallows server sync failures without throwing", async () => {
    apiClientMock.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error("put failed"));

    const { updatePreferences } = await loadPreferences();
    await expect(updatePreferences({ tableDensity: "compact" })).resolves.toEqual({
      tableDensity: "compact",
    });
  });

  it("notifies subscribers after an update", async () => {
    apiClientMock.mockResolvedValue({});
    const subscriber = vi.fn();

    const { updatePreferences, subscribeToPreferences } = await loadPreferences();
    subscribeToPreferences(subscriber);
    await updatePreferences({ tableDensity: "compact" });

    expect(subscriber).toHaveBeenLastCalledWith({ tableDensity: "compact" });
  });
});

describe("subscribeToPreferences", () => {
  it("invokes the callback immediately with current in-memory preferences", async () => {
    // subscribeToPreferences calls back with the in-memory state; it does not
    // lazy-load from localStorage at subscribe time.
    const subscriber = vi.fn();

    const { subscribeToPreferences } = await loadPreferences();
    subscribeToPreferences(subscriber);

    expect(subscriber).toHaveBeenCalledWith({});
  });

  it("returns an unsubscribe function that stops notifications", async () => {
    apiClientMock.mockResolvedValue({});
    const subscriber = vi.fn();

    const { updatePreferences, subscribeToPreferences } = await loadPreferences();
    const unsubscribe = subscribeToPreferences(subscriber);
    unsubscribe();

    await updatePreferences({ tableDensity: "compact" });

    // Called once for the immediate invocation only, not for the update.
    expect(subscriber).toHaveBeenCalledTimes(1);
  });
});

describe("resetPreferences", () => {
  it("clears in-memory state and localStorage and re-enables hydration", async () => {
    apiClientMock.mockResolvedValue({ tableDensity: "comfortable" });

    const { hydratePreferences, resetPreferences, getPreferences } =
      await loadPreferences();
    await hydratePreferences();

    resetPreferences();

    expect(getPreferences()).toEqual({});
    expect(localStorage.getItem("apexchain_user_preferences")).toBeNull();
    // Hydration gate is reset — a new hydrate triggers a fetch again.
    apiClientMock.mockClear();
    await hydratePreferences();
    expect(apiClientMock).toHaveBeenCalledTimes(1);
  });

  it("notifies subscribers with the empty preferences on reset", async () => {
    apiClientMock.mockResolvedValue({ tableDensity: "comfortable" });
    const subscriber = vi.fn();

    const { hydratePreferences, resetPreferences, subscribeToPreferences } =
      await loadPreferences();
    subscribeToPreferences(subscriber);
    await hydratePreferences();

    resetPreferences();

    expect(subscriber).toHaveBeenLastCalledWith({});
  });
});
