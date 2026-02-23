export interface TrendPoint {
  period: string;
  compliance_percentage: number;
  penalties: number;
  rewards: number;
}

export interface DashboardMetrics {
  sla_compliance_percentage: number;
  penalties: {
    total: number;
    count: number;
  };
  rewards: {
    total: number;
    count: number;
  };
  trends: TrendPoint[];
}
