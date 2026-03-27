"use client";

import KPICard from "@/components/dashboard/KPICard";
import PenaltiesRewardsChart from "@/components/dashboard/PenaltiesRewardsChart";
import SLATrendChart from "@/components/dashboard/SLATrendChart";
import { fetchDashboardMetrics } from "@/services/dashboardService";
import type { DashboardMetrics } from "@/types/dashboard";
import { useQuery } from "@tanstack/react-query";

export default function SLADashboardView() {
  const {
    data: metrics,
    isLoading,
    isError,
    refetch,
    dataUpdatedAt,
  } = useQuery<DashboardMetrics>({
    queryKey: ["dashboard-metrics"],
    queryFn: fetchDashboardMetrics,
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        Loading dashboard...
      </div>
    );
  }

  if (isError || !metrics) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 text-red-500">
        <p>Failed to load dashboard metrics.</p>
        <button
          onClick={() => void refetch()}
          className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
        >
          Retry
        </button>
      </div>
    );
  }

  const netBalance = metrics.rewards.total - metrics.penalties.total;
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleString() : "Not synced yet";

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-800">SLA Analytics Dashboard</h1>
          <p className="text-sm text-gray-500">
            Live backend analytics for compliance, payouts, and trend movement.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-wide text-gray-400">
            Updated {lastUpdated}
          </span>
          <button
            onClick={() => void refetch()}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
      </div>

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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SLATrendChart data={metrics.trends} />
        <PenaltiesRewardsChart data={metrics.trends} />
      </div>
    </div>
  );
}
