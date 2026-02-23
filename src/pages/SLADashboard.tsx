import React, { useEffect, useState } from "react";
import { fetchDashboardMetrics } from "../services/dashboardService";
import { DashboardMetrics } from "../types/dashboard";
import KPICard from "../components/dashboard/KPICard";
import SLATrendChart from "../components/dashboard/SLATrendChart";
import PenaltiesRewardsChart from "../components/dashboard/PenaltiesRewardsChart";

const SLADashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardMetrics()
      .then(setMetrics)
      .catch(() => setError("Failed to load dashboard metrics."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        Loading dashboard...
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="flex h-64 items-center justify-center text-red-500">
        {error || "No data available."}
      </div>
    );
  }

  const netBalance = metrics.rewards.total - metrics.penalties.total;

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-800">SLA Analytics Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="SLA Compliance"
          value={`${metrics.sla_compliance_percentage.toFixed(1)}%`}
          subtitle="Overall compliance rate"
          highlight={metrics.sla_compliance_percentage >= 90 ? "green" : "red"}
        />
        <KPICard
          title="Total Penalties"
          value={`$${metrics.penalties.total.toLocaleString()}`}
          subtitle={`${metrics.penalties.count} incidents`}
          highlight="red"
        />
        <KPICard
          title="Total Rewards"
          value={`$${metrics.rewards.total.toLocaleString()}`}
          subtitle={`${metrics.rewards.count} achievements`}
          highlight="green"
        />
        <KPICard
          title="Net Balance"
          value={`${netBalance >= 0 ? "+" : ""}$${netBalance.toLocaleString()}`}
          subtitle="Rewards minus penalties"
          highlight={netBalance >= 0 ? "green" : "red"}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SLATrendChart data={metrics.trends} />
        <PenaltiesRewardsChart data={metrics.trends} />
      </div>
    </div>
  );
};

export default SLADashboard;
