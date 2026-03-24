import { api } from "@/lib/api";
import { DashboardMetrics } from "../types/dashboard";

export const fetchDashboardMetrics = async (): Promise<DashboardMetrics> => {
  const response = await api.get<DashboardMetrics>("/dashboard/metrics");
  return response.data;
};
