/** ApexChain Network Operations Intelligence Platform */
import { beforeEach, describe, expect, it, vi } from "vitest";

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

import { ApiError } from "@/lib/errors";
import {
  fetchDashboardKpis,
  fetchDashboardMetrics,
  fetchDashboardTrends,
} from "@/services/dashboardService";

/**
 * Issue #606 — the dashboard used to collapse every failure into a bare
 * message, so the correlation id the backend returned was lost and support
 * had nothing to trace. These tests pin the id across every dashboard fetch
 * path.
 */
function serverError(correlationId: string | null, message = "Upstream metrics are down") {
  return {
    response: {
      status: 503,
      headers: correlationId ? { "x-correlation-id": correlationId } : {},
      data: { message },
    },
    message,
  };
}

beforeEach(() => {
  mockGet.mockReset();
});

describe("dashboard error correlation ids (#606)", () => {
  it("retains the correlation id when the metrics endpoint fails", async () => {
    mockGet.mockRejectedValueOnce(serverError("corr-kpis-123"));

    const error = await fetchDashboardKpis().catch((err: unknown) => err);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).correlationId).toBe("corr-kpis-123");
    expect((error as ApiError).message).toBe("Upstream metrics are down");
  });

  it("retains the correlation id when the trends endpoint fails", async () => {
    mockGet.mockRejectedValueOnce(serverError("corr-trends-456"));

    const error = await fetchDashboardTrends().catch((err: unknown) => err);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).correlationId).toBe("corr-trends-456");
  });

  it("falls back to the body request id when the header is absent", async () => {
    mockGet.mockRejectedValueOnce({
      response: { status: 500, data: { requestId: "req-body-789" } },
      message: "boom",
    });

    const error = await fetchDashboardKpis().catch((err: unknown) => err);

    expect((error as ApiError).correlationId).toBe("req-body-789");
  });

  it("propagates the correlation id through the composite metrics fetch", async () => {
    mockGet.mockRejectedValue(serverError("corr-composite"));

    const error = await fetchDashboardMetrics().catch((err: unknown) => err);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).correlationId).toBe("corr-composite");
  });

  it("still reports a useful message when no correlation id is supplied", async () => {
    mockGet.mockRejectedValueOnce(serverError(null, "Network Error"));

    const error = await fetchDashboardTrends().catch((err: unknown) => err);

    expect((error as ApiError).correlationId).toBeUndefined();
    expect((error as ApiError).message).toBe("Network Error");
  });
});
