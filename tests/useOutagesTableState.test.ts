/** ApexChain Network Operations Intelligence Platform */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

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

import { resetPreferences } from "@/lib/preferences";
import { useFilterPresets } from "@/hooks/useOutagesTableState";

const PREFERENCES_KEY = "apexchain_user_preferences";

describe("useFilterPresets", () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset the preferences module state (in-memory store + hydration flag)
    // so tests do not leak presets/hydration into each other.
    resetPreferences();
    mockGet.mockReset();
    mockPut.mockReset();
    mockGet.mockResolvedValue({ data: {} });
    mockPut.mockResolvedValue({ data: {} });
  });

  it("initializes with empty presets", () => {
    const { result } = renderHook(() => useFilterPresets());
    expect(result.current.presets).toEqual([]);
  });

  it("loads presets from the centralized preferences store (#300)", async () => {
    const presets = [{ name: "High Severity", severity: "high" }];
    // The hook persists presets via @/lib/preferences (key
    // `apexchain_user_preferences`), not the legacy divergent
    // `outage_filter_presets` key removed with Dry.tsx.
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ outageFilterPresets: presets }));

    const { result } = renderHook(() => useFilterPresets());
    await waitFor(() => {
      expect(result.current.presets).toEqual(presets);
    });
  });

  it("saves a preset", async () => {
    const { result } = renderHook(() => useFilterPresets());

    await act(async () => {
      result.current.savePreset({ name: "Test", severity: "high" });
    });

    await waitFor(() => {
      expect(result.current.presets).toHaveLength(1);
    });
    expect(result.current.presets[0]?.name).toBe("Test");
  });

  it("deletes a preset", async () => {
    const { result } = renderHook(() => useFilterPresets());

    await act(async () => {
      result.current.savePreset({ name: "Test" });
    });
    await waitFor(() => expect(result.current.presets).toHaveLength(1));

    await act(async () => {
      result.current.deletePreset("Test");
    });

    await waitFor(() => {
      expect(result.current.presets).toHaveLength(0);
    });
  });

  it("replaces existing preset with same name", async () => {
    const { result } = renderHook(() => useFilterPresets());

    await act(async () => {
      result.current.savePreset({ name: "Test", severity: "low" });
    });
    await waitFor(() => expect(result.current.presets).toHaveLength(1));

    await act(async () => {
      result.current.savePreset({ name: "Test", severity: "high" });
    });

    await waitFor(() => {
      expect(result.current.presets).toHaveLength(1);
    });
    expect(result.current.presets[0]?.severity).toBe("high");
  });
});
