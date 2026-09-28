/** ApexChain Frontend Test Suite */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import SLADashboardView from "@/components/dashboard/sla-dashboard-view";
import { ApiError } from "@/lib/errors";
import type { DashboardKpis } from "@/services/dashboardService";
import type { TrendPoint } from "@/types/dashboard";

/**
 * Issue #606 — a metrics failure used to blank the whole dashboard and show a
 * generic message with nothing to act on. These tests pin the replacement:
 * each widget fails on its own, the failure surfaces the backend correlation
 * id, and Retry re-runs only the widget that failed.
 */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const mockFetchKpis = vi.fn();
const mockFetchTrends = vi.fn();

vi.mock("@/services/dashboardService", () => ({
  fetchDashboardKpis: (...a: unknown[]) => mockFetchKpis(...a),
  fetchDashboardTrends: (...a: unknown[]) => mockFetchTrends(...a),
  fetchDashboardMetrics: vi.fn(),
}));

const kpis: DashboardKpis = {
  sla_compliance_percentage: 92.5,
  penalties: { total: 120, count: 3 },
  rewards: { total: 500, count: 7 },
};

const trends: TrendPoint[] = [
  { period: "2026-08-01", compliance_percentage: 90, penalties: 10, rewards: 50 },
];

function apiError(message: string, correlationId?: string): ApiError {
  return new ApiError({ message, kind: "unknown", status: 500, correlationId });
}

function renderView() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SLADashboardView />
    </QueryClientProvider>,
  );
}

describe("dashboard per-widget failures (#606)", () => {
  beforeEach(() => {
    mockFetchKpis.mockReset().mockResolvedValue(kpis);
    mockFetchTrends.mockReset().mockResolvedValue(trends);
  });

  it("keeps the trend charts live when the KPI widget fails, and shows the correlation id", async () => {
    mockFetchKpis.mockRejectedValue(apiError("Metrics backend unavailable", "corr-9f2c"));

    renderView();

    // The failing widget is isolated to its own panel...
    const panel = await screen.findByTestId("dashboard-widget-error");
    expect(panel).toHaveAttribute("data-widget", "SLA metrics");
    expect(panel).toHaveTextContent("Metrics backend unavailable");
    expect(panel).toHaveTextContent("Ref ID:");
    expect(panel).toHaveTextContent("corr-9f2c");

    // ...while the sibling widget renders normally.
    expect(screen.getByRole("heading", { name: "SLA Compliance Trend" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Penalties vs Rewards Over Time" })).toBeInTheDocument();
    expect(screen.queryByText("SLA Compliance")).not.toBeInTheDocument();
  });

  it("isolates a trend-chart failure from the KPI tiles", async () => {
    mockFetchTrends.mockRejectedValue(apiError("Trends backend unavailable", "corr-trends"));

    renderView();

    const panel = await screen.findByTestId("dashboard-widget-error");
    expect(panel).toHaveAttribute("data-widget", "Trend charts");
    expect(panel).toHaveTextContent("corr-trends");

    // The KPI tiles are unaffected by the chart failure.
    expect(screen.getByText("SLA Compliance")).toBeInTheDocument();
    expect(screen.getByText("92.5%")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "SLA Compliance Trend" })).not.toBeInTheDocument();
  });

  it("recovers one widget on retry without re-running the healthy widget's query", async () => {
    mockFetchKpis
      .mockRejectedValueOnce(apiError("Metrics backend unavailable", "corr-1"))
      .mockResolvedValueOnce(kpis);

    renderView();

    await screen.findByTestId("dashboard-widget-error");
    expect(mockFetchTrends).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Retry SLA metrics" }));

    // The failed widget recovers in place...
    expect(await screen.findByText("SLA Compliance")).toBeInTheDocument();
    expect(screen.getByText("92.5%")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByTestId("dashboard-widget-error")).not.toBeInTheDocument(),
    );

    // ...and only that widget was refetched — the charts query still holds.
    expect(mockFetchKpis).toHaveBeenCalledTimes(2);
    expect(mockFetchTrends).toHaveBeenCalledTimes(1);
  });

  it("reports a failed retry instead of clearing the failure state", async () => {
    mockFetchKpis.mockRejectedValue(apiError("Metrics backend unavailable", "corr-still-down"));

    renderView();

    await screen.findByTestId("dashboard-widget-error");
    fireEvent.click(screen.getByRole("button", { name: "Retry SLA metrics" }));

    await waitFor(() => expect(mockFetchKpis).toHaveBeenCalledTimes(2));
    expect(await screen.findByTestId("dashboard-widget-error")).toHaveTextContent(
      "corr-still-down",
    );
  });
});
