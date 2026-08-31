/** ApexChain Network Operations Intelligence Platform */
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGet = vi.fn();

vi.mock("@/lib/api", () => ({
  api: { get: (...a: unknown[]) => mockGet(...a) },
}));

vi.mock("@/lib/endpoints", () => ({
  ENDPOINTS: {
    sla: {
      dashboard: "/sla/analytics/dashboard",
      trends: "/sla/analytics/trends",
    },
  },
}));

import { fetchDashboardMetrics } from "@/services/dashboardService";

beforeEach(() => {
  mockGet.mockReset();
});

describe("fetchDashboardMetrics", () => {
  it("maps KPI reward and penalty amounts directly from the API", async () => {
    mockGet
      .mockResolvedValueOnce({
        data: {
          total_outages: 10,
          total_violations: 3,
          total_rewards: 500,
          total_penalties: 120,
          net_payout: 380,
        },
      })
      .mockResolvedValueOnce({ data: [] });

    const metrics = await fetchDashboardMetrics({ date_from: "2026-01-01" });

    expect(metrics.rewards.total).toBe(500);
    expect(metrics.penalties.total).toBe(120);
    // Derived count: outages that were not violations (10 - 3).
    expect(metrics.rewards.count).toBe(7);
    expect(metrics.penalties.count).toBe(3);
  });

  it("does not let a derived count go negative when violations exceed outages", async () => {
    mockGet
      .mockResolvedValueOnce({
        data: {
          total_outages: 2,
          total_violations: 5,
          total_rewards: 10,
          total_penalties: 50,
          net_payout: -40,
        },
      })
      .mockResolvedValueOnce({ data: [] });

    const metrics = await fetchDashboardMetrics();

    expect(metrics.rewards.count).toBe(0);
    expect(metrics.rewards.total).toBe(10);
    expect(metrics.penalties.count).toBe(5);
  });

  it("computes per-trend compliance percentages", async () => {
    mockGet
      .mockResolvedValueOnce({
        data: { total_outages: 0, total_violations: 0, total_rewards: 0, total_penalties: 0, net_payout: 0 },
      })
      .mockResolvedValueOnce({
        data: [
          { date: "2026-01-01", total_outages: 4, violations: 1, rewards: 3, penalties: 1 },
          { date: "2026-01-02", total_outages: 0, violations: 0, rewards: 0, penalties: 0 },
        ],
      });

    const metrics = await fetchDashboardMetrics();

    expect(metrics.trends[0]).toMatchObject({
      period: "2026-01-01",
      compliance_percentage: 75,
      rewards: 3,
      penalties: 1,
    });
    // Empty trend period reports 0% (the "no data" display is handled in UI).
    expect(metrics.trends[1]).toMatchObject({ period: "2026-01-02", compliance_percentage: 0 });
  });
});
