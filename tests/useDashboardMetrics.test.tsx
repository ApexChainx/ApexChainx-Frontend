/** ApexChain Frontend Test Suite */
/**
 * Issue #605 — the dashboard had no offline snapshot, so a network blip left
 * the landing page blank even though outages and payments already hydrate from
 * IndexedDB. These tests pin the three halves of the fix: successful fetches
 * are persisted, the snapshot hydrates on mount, and a snapshot-backed render
 * is reported as stale instead of being mistaken for live data.
 */
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGet = vi.fn();
const mockSet = vi.fn();
const mockClearOldSchemaVersions = vi.fn();
const mockDebouncedCacheSet = vi.fn();

vi.mock("@/lib/persisted-cache", () => ({
  persistedCache: {
    get: (...a: unknown[]) => mockGet(...a),
    set: (...a: unknown[]) => mockSet(...a),
  },
  clearOldSchemaVersions: () => mockClearOldSchemaVersions(),
}));

vi.mock("@/lib/debounced-cache", () => ({
  debouncedCacheSet: (...a: unknown[]) => mockDebouncedCacheSet(...a),
}));

const mockFetch = vi.fn();

vi.mock("@/services/dashboardService", () => ({
  fetchDashboardMetrics: (...a: unknown[]) => mockFetch(...a),
}));

import { useDashboardMetrics } from "@/features/dashboard/hooks/useDashboardMetrics";
import type { DashboardMetrics } from "@/types/dashboard";

const snapshot: DashboardMetrics = {
  sla_compliance_percentage: 88,
  penalties: { total: 120, count: 3 },
  rewards: { total: 500, count: 7 },
  trends: [{ period: "2026-08-01", compliance_percentage: 90, penalties: 10, rewards: 50 }],
};

const liveMetrics: DashboardMetrics = {
  sla_compliance_percentage: 92.5,
  penalties: { total: 10, count: 1 },
  rewards: { total: 40, count: 2 },
  trends: [],
};

function renderHookWithClient() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useDashboardMetrics({}), { wrapper });
}

describe("useDashboardMetrics offline snapshot (#605)", () => {
  beforeEach(() => {
    mockGet.mockReset().mockResolvedValue(null);
    mockSet.mockReset().mockResolvedValue(undefined);
    mockClearOldSchemaVersions.mockReset().mockResolvedValue(undefined);
    mockDebouncedCacheSet.mockReset().mockResolvedValue(undefined);
    mockFetch.mockReset().mockResolvedValue(liveMetrics);
  });

  it("keys the snapshot into the shared factory namespace", async () => {
    renderHookWithClient();

    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(mockGet.mock.calls[0]![0]).toContain("dashboard-metrics");
    expect(mockClearOldSchemaVersions).toHaveBeenCalled();
  });

  it("persists a successful metrics snapshot", async () => {
    renderHookWithClient();

    await waitFor(() =>
      expect(mockDebouncedCacheSet).toHaveBeenCalledWith(
        expect.stringContaining("dashboard-metrics"),
        liveMetrics,
        expect.any(Number),
        expect.any(Number),
      ),
    );
  });

  it("hydrates the cached snapshot when the live request fails", async () => {
    mockGet.mockResolvedValue(snapshot);
    mockFetch.mockRejectedValue(new Error("network down"));

    const { result } = renderHookWithClient();

    await waitFor(() => expect(result.current.data).toEqual(snapshot));
    // The tiles come from the persisted snapshot, so the UI must say so.
    await waitFor(() => expect(result.current.isStaleSnapshot).toBe(true));
  });

  it("does not flag a live fetch as a stale snapshot", async () => {
    mockGet.mockResolvedValue(snapshot);
    mockFetch.mockResolvedValue(liveMetrics);

    const { result } = renderHookWithClient();

    await waitFor(() => expect(result.current.data).toEqual(liveMetrics));
    expect(result.current.isStaleSnapshot).toBe(false);
  });

  it("does not flag a fresh load with no cached snapshot as stale", async () => {
    const { result } = renderHookWithClient();

    await waitFor(() => expect(result.current.data).toEqual(liveMetrics));
    expect(result.current.isStaleSnapshot).toBe(false);
  });

  it("loads the dashboard with no filters selected", async () => {
    renderHookWithClient();

    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith({}));
  });
});
