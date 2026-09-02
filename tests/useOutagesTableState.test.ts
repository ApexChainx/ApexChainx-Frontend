/** ApexChain Network Operations Intelligence Platform */
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFilterPresets } from "@/hooks/useOutagesTableState";
import { resetPreferences } from "@/lib/preferences";

describe("useFilterPresets", () => {
  beforeEach(() => {
    localStorage.clear();
    // The preferences module caches state at module level; reset it between
    // tests so presets from one test don't leak into the next.
    resetPreferences();
  });

  it("initializes with empty presets", () => {
    const { result } = renderHook(() => useFilterPresets());
    expect(result.current.presets).toEqual([]);
  });

  it("loads presets from localStorage", () => {
    const presets = [{ name: "High Severity", severity: "high" }];
    // Presets live inside the synced preferences object (see src/lib/preferences.ts).
    localStorage.setItem(
      "apexchain_user_preferences",
      JSON.stringify({ outageFilterPresets: presets }),
    );

    const { result } = renderHook(() => useFilterPresets());
    expect(result.current.presets).toEqual(presets);
  });

  it("saves a preset", () => {
    const { result } = renderHook(() => useFilterPresets());

    act(() => {
      result.current.savePreset({ name: "Test", severity: "high" });
    });

    expect(result.current.presets).toHaveLength(1);
    expect(result.current.presets[0]?.name).toBe("Test");
  });

  it("deletes a preset", () => {
    const { result } = renderHook(() => useFilterPresets());

    act(() => {
      result.current.savePreset({ name: "Test" });
    });

    act(() => {
      result.current.deletePreset("Test");
    });

    expect(result.current.presets).toHaveLength(0);
  });

  it("replaces existing preset with same name", () => {
    const { result } = renderHook(() => useFilterPresets());

    act(() => {
      result.current.savePreset({ name: "Test", severity: "low" });
    });

    act(() => {
      result.current.savePreset({ name: "Test", severity: "high" });
    });

    expect(result.current.presets).toHaveLength(1);
    expect(result.current.presets[0]?.severity).toBe("high");
  });
});
