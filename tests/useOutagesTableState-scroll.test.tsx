/** ApexChain Network Operations Intelligence Platform */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useOutagesTableState } from "@/hooks/useOutagesTableState";

const mockPush = vi.fn();
const mockGet = vi.fn((key: string) => {
  if (key === "page") return "1";
  if (key === "page_size") return "10";
  return null;
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({ get: mockGet, toString: () => "page=1&page_size=10" }),
}));

// Preferences are not used by useOutagesTableState, but the module is
// imported by the same file; mock it to avoid localStorage issues.
vi.mock("@/lib/preferences", () => ({
  getPreferences: () => ({ outageFilterPresets: [] }),
  hydratePreferences: () => Promise.resolve({ outageFilterPresets: [] }),
  subscribeToPreferences: () => vi.fn(),
  updatePreferences: vi.fn(),
}));

describe("useOutagesTableState scroll:false", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("setParam calls router.push with scroll: false", () => {
    const { result } = renderHook(() => useOutagesTableState());

    act(() => {
      result.current.actions.setParam("severity", "critical");
    });

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("severity=critical"),
      { scroll: false },
    );
  });

  it("setParam deleting a param calls router.push with scroll: false", () => {
    const { result } = renderHook(() => useOutagesTableState());

    act(() => {
      result.current.actions.setParam("severity");
    });

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(expect.any(String), { scroll: false });
  });

  it("setStatus (via setMultiParam) calls router.push with scroll: false", () => {
    const { result } = renderHook(() => useOutagesTableState());

    act(() => {
      result.current.actions.setStatus("open");
    });

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("status=open"),
      { scroll: false },
    );
  });

  it("clearSort (via setMultiParam) calls router.push with scroll: false", () => {
    const { result } = renderHook(() => useOutagesTableState());

    act(() => {
      result.current.actions.clearSort();
    });

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(expect.any(String), { scroll: false });
  });

  it("setPage calls router.push with scroll: false", () => {
    const { result } = renderHook(() => useOutagesTableState());

    act(() => {
      result.current.actions.setPage(3);
    });

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("page=3"),
      { scroll: false },
    );
  });

  it("setSeverity calls router.push with scroll: false", () => {
    const { result } = renderHook(() => useOutagesTableState());

    act(() => {
      result.current.actions.setSeverity("high");
    });

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("severity=high"),
      { scroll: false },
    );
  });
});