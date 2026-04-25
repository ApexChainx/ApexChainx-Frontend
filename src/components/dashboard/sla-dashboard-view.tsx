"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import KPICard from "@/components/dashboard/KPICard";
import PenaltiesRewardsChart from "@/components/dashboard/PenaltiesRewardsChart";
import SLATrendChart from "@/components/dashboard/SLATrendChart";
import { RouteErrorState, RouteLoadingState } from "@/components/ui/route-state";
import { fetchDashboardMetrics, type DashboardFilters } from "@/services/dashboardService";
import type { DashboardMetrics, TrendPoint } from "@/types/dashboard";
import { useQuery } from "@tanstack/react-query";

const SEVERITIES = ["", "low", "medium", "high", "critical"];

export default function SLADashboardView() {
  const router = useRouter();
  const [filters, setFilters] = useState<DashboardFilters>({});

  const {
    data: metrics,
    isLoading,
    isError,
    refetch,
    dataUpdatedAt,
  } = useQuery<DashboardMetrics>({
    queryKey: ["dashboard-metrics", filters],
    queryFn: () => fetchDashboardMetrics(filters),
    staleTime: 30_000,
  });

  function set(key: keyof DashboardFilters, value: string) {
    setFilters((f) => ({ ...f, [key]: value || undefined }));
  }

  // FE-076: drilldown — navigate to outages/payments with filter context
  function onTrendClick(point: TrendPoint) {
    const params = new URLSearchParams();
    if (point.period) params.set("date_from", point.period);
    if (filters.severity) params.set("severity", filters.severity);
    if (filters.site) params.set("site", filters.site);
    router.push(`/outages?${params.toString()}`);
  }

  function onPenaltyClick(point: TrendPoint) {
    const params = new URLSearchParams();
    if (point.period) params.set("date_from", point.period);
    params.set("type", "penalty");
    router.push(`/payments?${params.toString()}`);
  }

  function onRewardClick(point: TrendPoint) {
    const params = new URLSearchParams();
    if (point.period) params.set("date_from", point.period);
    params.set("type", "reward");
    router.push(`/payments?${params.toString()}`);
  }

  if (isLoading) {
    return (
      <RouteLoadingState
        title="Loading dashboard"
        description="Pulling the latest SLA compliance, trends, and payout metrics."
      />
    );
  }

  if (isError || !metrics) {
    return (
      <RouteErrorState
        title="Dashboard unavailable"
        description="We could not load the latest analytics right now."
        actionLabel="Retry"
        onAction={() => void refetch()}
      />
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

      {/* FE-074 + FE-075: date range + severity/site filters */}
      <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <label className="space-y-1 text-xs">
          <span className="font-medium text-slate-600">From</span>
          <input
            type="date"
            className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-sm"
            value={filters.date_from ?? ""}
            onChange={(e) => set("date_from", e.target.value)}
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="font-medium text-slate-600">To</span>
          <input
            type="date"
            className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-sm"
            value={filters.date_to ?? ""}
            onChange={(e) => set("date_to", e.target.value)}
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="font-medium text-slate-600">Severity</span>
          <select
            className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-sm"
            value={filters.severity ?? ""}
            onChange={(e) => set("severity", e.target.value)}
          >
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>{s || "All"}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs">
          <span className="font-medium text-slate-600">Site</span>
          <input
            type="text"
            placeholder="e.g. site-a"
            className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-sm"
            value={filters.site ?? ""}
            onChange={(e) => set("site", e.target.value)}
          />
        </label>
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
        {/* FE-076: pass drilldown handlers */}
        <SLATrendChart data={metrics.trends} onPointClick={onTrendClick} />
        <PenaltiesRewardsChart
          data={metrics.trends}
          onPenaltyClick={onPenaltyClick}
          onRewardClick={onRewardClick}
        />
      </div>
    </div>
  );
}
