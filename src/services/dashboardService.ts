import axios from "axios";
import { DashboardMetrics } from "../types/dashboard";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export const fetchDashboardMetrics = async (): Promise<DashboardMetrics> => {
  const response = await axios.get<DashboardMetrics>(
    `${API_BASE}/dashboard/metrics`
  );
  return response.data;
};
