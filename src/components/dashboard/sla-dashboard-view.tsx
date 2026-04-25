"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import KPICard from "@/components/dashboard/KPICard";
import PenaltiesRewardsChart from "@/components/dashboard/PenaltiesRewardsChart";
import SLATrendChart from "@/components/dashboard/SLATrendChart";
import { RouteErrorState, RouteLoadingState } from "@/components/ui/route-state";
import { fetchDashboardMetrics, type DashboardFilters } from "@/services/dashboardService";
import type { DashboardMetrics, TrendPoint } from "@/types/dashboard";

function exportSnapshot(metrics: DashboardMetrics, label = "dashboard") {
  const snapshot = {
    exported_at: new Date().toISOString(),
    label,
    sla_compliance_percentage: metrics.sla_compliance_percentage,
    penalties: metrics.penalties,
    rewards: metrics.rewards,
    trends: metrics.trends,
  };
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sla-snapshot-${label}-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function delta(a: number, b: number) {
  const d = a - b;
  return `${d >= 0 ? "+" : ""}${d.toFixed(1)}`;
}

const SEVERITIES = ["", "low", "medium", "high", "critical"];

export default function SLADashboardView() {
  const router = useRouter();
  const [compareMode, setCompareMode] = useState(false);
  const [filters, setFilters] = useState<DashboardFilters>({});

  function set(key: keyof DashboardFilters, value: string) {
    setFilters((f) => ({ ...f, [key]: value || undefined }));
  }

  const primary = useQuery<DashboardMetrics>({
    queryKey: ["dashboard-metrics", filters],
    queryFn: () => fetchDashboardMetrics(filters),
    staleTime: 30_000,
  });

  const secondary = useQuery<DashboardMetrics>({
    queryKey: ["dashboard-metrics-compare"],
    queryFn: () => fetchDashboardMetrics(),
    staleTime: 30_000,
    enabled: compareMode,
  });

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

  if (primary.isLoading) {
    return (
      <RouteLoadingState
        title="Loading dashboard"
        description="Pulling the latest SLA compliance, trends, and payout metrics."
      />
    );
  }

  if (primary.isError || !primary.data) {
    return (
      <RouteErrorState
        title="Dashboard unavailable"
        description="We could not load the latest analytics right now."
        actionLabel="Retry"
        onAction={() => void primary.refetch()}
      />
    );
  }

  const metrics = primary.data;
  const netBalance = metrics.rewards.total - metrics.penalties.total;
  const lastUpdated = primary.dataUpdatedAt
    ? new Date(primary.dataUpdatedAt).toLocaleString()
    : "Not synced yet";
  const cmp = compareMode && secondary.data ? secondary.data : null;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-800">SLA Analytics Dashboard</h1>
          <p className="text-sm text-gray-500">Live backend analytics for compliance, payouts, and trend movement.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-gray-400">Updated {lastUpdated}</span>
          <button
            onClick={() => setCompareMode((v) => !v)}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${compareMode ? "border-blue-400 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
          >
            {compareMode ? "Exit Compare" : "Compare"}
          </button>
          <button onClick={() => exportSnapshot(metrics)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50">Export</button>
          <button onClick={() => void primary.refetch()} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50">Refresh</button>
        </div>
      </div>

      {compareMode && secondary.isLoading ? <p className="text-sm text-gray-400">Loading comparison window…</p> : null}

      <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <label className="space-y-1 text-xs">
          <span className="font-medium text-slate-600">From</span>
          <input type="date" className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-sm" value={filters.date_from ?? ""} onChange={(e) => set("date_from", e.target.value)} />
        </label>
        <label className="space-y-1 text-xs">
          <span className="font-medium text-slate-600">To</span>
          <input type="date" className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-sm" value={filters.date_to ?? ""} onChange={(e) => set("date_to", e.target.value)} />
        </label>
        <label className="space-y-1 text-xs">
          <span className="font-medium text-slate-600">Severity</span>
          <select className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-sm" value={filters.severity ?? ""} onChange={(e) => set("severity", e.target.value)}>
            {SEVERITIES.map((s) => <option key={s} value={s}>{s || "All"}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-xs">
          <span className="font-medium text-slate-600">Site</span>
          <input type="text" placeholder="e.g. site-a" className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-sm" value={filters.site ?? ""} onChange={(e) => set("site", e.target.value)} />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="SLA Compliance"
          value={`${metrics.sla_compliance_percentage.toFixed(1)}%`}
          subtitle={cmp ? `vs ${cmp.sla_compliance_percentage.toFixed(1)}% (${delta(metrics.sla_compliance_percentage, cmp.sla_compliance_percentage)}pp)` : "Overall compliance rate"}
          highlight={metrics.sla_compliance_percentage >= 90 ? "green" : "red"}
        />
        <KPICard
          title="Total Penalties"
          value={`$${metrics.penalties.total.toLocaleString()}`}
          subtitle={cmp ? `vs $${cmp.penalties.total.toLocaleString()} (${delta(metrics.penalties.total, cmp.penalties.total)})` : `${metrics.penalties.count} incidents`}
          highlight="red"
        />
        <KPICard
          title="Total Rewards"
          value={`$${metrics.rewards.total.toLocaleString()}`}
          subtitle={cmp ? `vs $${cmp.rewards.total.toLocaleString()} (${delta(metrics.rewards.total, cmp.rewards.total)})` : `${metrics.rewards.count} achievements`}
          highlight="green"
        />
        <KPICard
          title="Net Balance"
          value={`${netBalance >= 0 ? "+" : ""}$${netBalance.toLocaleString()}`}
          subtitle={(() => {
            if (!cmp) return "Rewards minus penalties";
            const cmpNet = cmp.rewards.total - cmp.penalties.total;
            return `vs ${cmpNet >= 0 ? "+" : ""}$${cmpNet.toLocaleString()} (${delta(netBalance, cmpNet)})`;
          })()}
          highlight={netBalance >= 0 ? "green" : "red"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SLATrendChart data={metrics.trends} onPointClick={onTrendClick} />
        <PenaltiesRewardsChart data={metrics.trends} onPenaltyClick={onPenaltyClick} onRewardClick={onRewardClick} />
      </div>

      {cmp && cmp.trends.length > 0 ? (
        <div>
          <p className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wide">Comparison Window</p>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SLATrendChart data={cmp.trends} />
            <PenaltiesRewardsChart data={cmp.trends} />
          </div>
        </div>
      ) : null}

      {compareMode && cmp && cmp.trends.length === 0 ? (
        <p className="rounded-lg bg-yellow-50 px-4 py-2 text-sm text-yellow-700">No data available for the comparison window.</p>
      ) : null}
    </div>
  );
}
