/** ApexChain Frontend Test Suite */
/**
 * Issue #607 — the acceptance scenario is "one metric fails, the other tiles
 * still render". This drives the real dashboard view with a malformed metric
 * payload so the failure happens inside a tile's own derivation, and asserts
 * the boundary contains it.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import SLADashboardView from "@/components/dashboard/sla-dashboard-view";
import type { DashboardMetrics } from "@/types/dashboard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/services/dashboardService", () => ({
  fetchDashboardMetrics: vi.fn().mockResolvedValue(null),
}));

const refetch = vi.fn();

function malformedMetrics(): DashboardMetrics {
  return {
    sla_compliance_percentage: 92.5,
    // The backend omitted total_penalties: formatting it throws inside the
    // tile, which is exactly the "one failing tile" scenario from the issue.
    penalties: { total: null as unknown as number, count: 3 },
    rewards: { total: 500, count: 7 },
    trends: [{ period: "2026-08-01", compliance_percentage: 90, penalties: 10, rewards: 50 }],
  };
}

let queryResult: Record<string, unknown>;

vi.mock("@/features/dashboard/hooks/useDashboardMetrics", () => ({
  useDashboardMetrics: () => queryResult,
}));

function renderView() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SLADashboardView />
    </QueryClientProvider>,
  );
}

describe("dashboard tile isolation (#607)", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    refetch.mockReset();
    queryResult = {
      data: malformedMetrics(),
      isLoading: false,
      isError: false,
      isFetching: false,
      isStaleSnapshot: false,
      failureCount: 0,
      dataUpdatedAt: Date.now(),
      refetch,
    };
  });

  it("keeps the healthy tiles on screen when one metric cannot be rendered", () => {
    renderView();

    const fallback = screen.getByTestId("metric-error-boundary");
    expect(fallback).toHaveAttribute("data-metric", "Total Penalties");

    // The remaining tiles, the filters and the charts are all still there.
    expect(screen.getByText("SLA Compliance")).toBeInTheDocument();
    expect(screen.getByText("92.5%")).toBeInTheDocument();
    expect(screen.getByText("Total Rewards")).toBeInTheDocument();
    expect(screen.getByText("$500")).toBeInTheDocument();
    expect(screen.getByText("Net Balance")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "SLA Compliance Trend" })).toBeInTheDocument();
    expect(screen.getAllByTestId("metric-error-boundary")).toHaveLength(1);
  });

  it("retries the metrics query from the failing tile without touching the page", () => {
    renderView();

    fireEvent.click(screen.getByRole("button", { name: "Retry Total Penalties" }));

    expect(refetch).toHaveBeenCalledTimes(1);
    // The page shell was never unmounted: the filters are still rendered.
    expect(screen.getByText("Filters")).toBeInTheDocument();
  });

  it("flags a snapshot-backed render as cached", () => {
    queryResult = {
      ...queryResult,
      isStaleSnapshot: true,
      data: {
        sla_compliance_percentage: 88,
        penalties: { total: 120, count: 3 },
        rewards: { total: 500, count: 7 },
        trends: [],
      } satisfies DashboardMetrics,
    };

    renderView();

    expect(screen.getByTestId("dashboard-snapshot-badge")).toHaveTextContent("Cached snapshot");
    expect(screen.getByText("88.0%")).toBeInTheDocument();
  });

  it("shows the route-level error state only when there is no data at all", () => {
    queryResult = {
      ...queryResult,
      data: undefined,
      isError: true,
      failureCount: 3,
    };

    renderView();

    expect(screen.getByRole("alert")).toHaveTextContent("Dashboard unavailable");
    expect(screen.queryByTestId("metric-error-boundary")).not.toBeInTheDocument();
    // The route fallback still offers a recovery action.
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
