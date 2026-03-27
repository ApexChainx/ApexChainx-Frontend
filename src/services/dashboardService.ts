import { api } from "@/lib/api";
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

export const fetchDashboardMetrics = async (): Promise<DashboardMetrics> => {
  const [kpiResponse, trendResponse] = await Promise.all([
    api.get<DashboardKPIResponse>("/sla/analytics/dashboard"),
    api.get<DashboardTrendResponse[]>("/sla/analytics/trends"),
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
      total: kpis.total_penalties,
      count: kpis.total_violations,
    },
    rewards: {
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
