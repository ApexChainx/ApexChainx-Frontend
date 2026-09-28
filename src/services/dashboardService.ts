/** ApexChain Network Operations Intelligence Platform */
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import { ApiError } from "@/lib/errors";
import { DashboardMetrics, TrendPoint } from "../types/dashboard";

interface DashboardKPIResponse {
  total_outages: number;
  total_violations: number;
  total_rewards: number;
  total_penalties: number;
  net_payout: number;
}

interface DashboardTrendResponse {
  date: string;
  total_outages: number;
  violations: number;
  rewards: number;
  penalties: number;
}

export interface DashboardFilters {
  date_from?: string | undefined;
  date_to?: string | undefined;
  severity?: string | undefined;
  site?: string | undefined;
}

/** The KPI half of the dashboard: compliance, penalties, and rewards. */
export type DashboardKpis = Pick<
  DashboardMetrics,
  "sla_compliance_percentage" | "penalties" | "rewards"
>;

function requestParams(filters: DashboardFilters): Record<string, string> {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value),
  ) as Record<string, string>;
}

function mapKpis(kpis: DashboardKPIResponse): DashboardKpis {
  const compliantOutages = Math.max(0, kpis.total_outages - kpis.total_violations);
  const slaCompliancePercentage =
    kpis.total_outages === 0
      ? 0
      : (compliantOutages / kpis.total_outages) * 100;

  return {
    sla_compliance_percentage: slaCompliancePercentage,
    penalties: {
      // Amount comes straight from the KPI endpoint; the count is the number
      // of violations the backend attributed to the period.
      total: kpis.total_penalties,
      count: kpis.total_violations,
    },
    rewards: {
      // Amount comes straight from the KPI endpoint. The KPI response does not
      // yet expose a rewarded-outage count, so `count` is derived as the
      // number of outages that were not flagged as violations. Keep this in
      // sync with the backend's reward semantics; switch to a server-supplied
      // count when the API adds one.
      total: kpis.total_rewards,
      count: compliantOutages,
    },
  };
}

function mapTrends(trends: DashboardTrendResponse[]): TrendPoint[] {
  return trends.map((point) => ({
    period: point.date,
    compliance_percentage:
      point.total_outages === 0
        ? 0
        : ((point.total_outages - point.violations) / point.total_outages) * 100,
    penalties: point.penalties,
    rewards: point.rewards,
  }));
}

/**
 * Issue #606 — the dashboard is rendered as independent widgets, so each one
 * fetches only what it shows. A failing KPI request must not blank the trend
 * charts (and vice versa), and retrying a widget re-runs just that request.
 *
 * Both fetchers wrap transport failures in `ApiError`, which keeps the
 * correlation id the backend returned on the response headers/body so the
 * widget fallback can hand it to support instead of showing a bare message.
 */
export const fetchDashboardKpis = async (
  filters: DashboardFilters = {},
): Promise<DashboardKpis> => {
  try {
    const kpiResponse = await api.get<DashboardKPIResponse>(ENDPOINTS.sla.dashboard, {
      params: requestParams(filters),
    });
    return mapKpis(kpiResponse.data);
  } catch (error) {
    throw ApiError.fromError(error);
  }
};

export const fetchDashboardTrends = async (
  filters: DashboardFilters = {},
): Promise<TrendPoint[]> => {
  try {
    const trendResponse = await api.get<DashboardTrendResponse[]>(ENDPOINTS.sla.trends, {
      params: requestParams(filters),
    });
    return mapTrends(trendResponse.data);
  } catch (error) {
    throw ApiError.fromError(error);
  }
};

/**
 * Composite fetch kept for callers that persist a single dashboard snapshot
 * (see `useDashboardMetrics`). Individual widgets should prefer the two
 * fetchers above so a failure stays local to the widget that caused it.
 */
export const fetchDashboardMetrics = async (
  filters: DashboardFilters = {},
): Promise<DashboardMetrics> => {
  const [kpis, trends] = await Promise.all([
    fetchDashboardKpis(filters),
    fetchDashboardTrends(filters),
  ]);

  return { ...kpis, trends };
};
