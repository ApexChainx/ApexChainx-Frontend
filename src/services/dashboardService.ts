/** ApexChain Network Operations Intelligence Platform */
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import { DashboardMetrics } from "../types/dashboard";

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

export const fetchDashboardMetrics = async (filters: DashboardFilters = {}): Promise<DashboardMetrics> => {
  const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
  const [kpiResponse, trendResponse] = await Promise.all([
    api.get<DashboardKPIResponse>(ENDPOINTS.sla.dashboard, { params }),
    api.get<DashboardTrendResponse[]>(ENDPOINTS.sla.trends, { params }),
  ]);

  const kpis = kpiResponse.data;
  const trends = trendResponse.data;
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
    trends: trends.map((point) => ({
      period: point.date,
      compliance_percentage:
        point.total_outages === 0
          ? 0
          : ((point.total_outages - point.violations) / point.total_outages) * 100,
      penalties: point.penalties,
      rewards: point.rewards,
    })),
  };
};
