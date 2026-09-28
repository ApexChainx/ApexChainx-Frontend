"use client";
/** ApexChain Network Operations Intelligence Platform */

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import KPICard from "@/components/dashboard/KPICard";
import MetricErrorBoundary from "@/components/dashboard/MetricErrorBoundary";
import PenaltiesRewardsChart from "@/components/dashboard/PenaltiesRewardsChart";
import SLATrendChart from "@/components/dashboard/SLATrendChart";
import { RouteLoadingState } from "@/components/ui/route-state";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { fetchDashboardMetrics, type DashboardFilters } from "@/services/dashboardService";
import { useDashboardMetrics } from "@/features/dashboard/hooks/useDashboardMetrics";
import { slaEventKeys } from "@/lib/query-keys";
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

const DAY_MS = 24 * 60 * 60 * 1000;

function toISODate(date: Date) {
  return date.toISOString().split("T")[0];
}

/**
 * Builds the filters for the comparison window.
 *
 * The comparison window mirrors the primary filter range and shifts it
 * backward so it ends where the primary window starts:
 * - Both date_from and date_to set → same length as the primary range, ending at date_from.
 * - Only date_from set → mirrors the open-ended range [date_from, today].
 * - Only date_to set → defaults to the 30 days before date_to.
 * - No date range selected → {} (comparison is disabled).
 */
export function computeComparisonFilters(filters: DashboardFilters): DashboardFilters {
  const { date_from, date_to, severity, site } = filters;
  if (!date_from && !date_to) return {};

  let end: Date;
  let durationMs: number;

  if (date_from && date_to) {
    // Same length as the primary window, shifted backward to end at date_from.
    end = new Date(date_from);
    durationMs = Math.max(new Date(date_to).getTime() - end.getTime(), 0);
  } else if (date_from) {
    // Primary range is open-ended ([date_from, today]); mirror that duration.
    end = new Date(date_from);
    durationMs = Math.max(Date.now() - end.getTime(), 0);
  } else {
    // Only date_to set (guaranteed by the early return); fall back to a fixed 30-day window.
    end = new Date(date_to!);
    durationMs = 30 * DAY_MS;
  }

  const start = new Date(end.getTime() - durationMs);

  return {
    date_from: toISODate(start),
    date_to: toISODate(end),
    severity,
    site,
  };
}

/**
 * Issue #607 — each tile derives its own display value. Keeping the derivation
 * inside the tile (rather than inline in the grid) is what lets a malformed
 * metric fail inside its own error boundary instead of taking the page down.
 */
interface TileProps {
  metrics: DashboardMetrics;
  comparison: DashboardMetrics | null;
}

function ComplianceTile({ metrics, comparison }: TileProps) {
  const value = metrics.sla_compliance_percentage;
  return (
    <KPICard
      title="SLA Compliance"
      value={`${value.toFixed(1)}%`}
      subtitle={
        comparison
          ? `vs ${comparison.sla_compliance_percentage.toFixed(1)}% (${delta(value, comparison.sla_compliance_percentage)}pp)`
          : "Overall compliance rate"
      }
      highlight={value >= 90 ? "green" : "red"}
    />
  );
}

function PenaltiesTile({ metrics, comparison }: TileProps) {
  const total = metrics.penalties.total;
  return (
    <KPICard
      title="Total Penalties"
      value={`$${total.toLocaleString()}`}
      subtitle={
        comparison
          ? `vs $${comparison.penalties.total.toLocaleString()} (${delta(total, comparison.penalties.total)})`
          : `${metrics.penalties.count} incidents`
      }
      highlight="red"
    />
  );
}

function RewardsTile({ metrics, comparison }: TileProps) {
  const total = metrics.rewards.total;
  return (
    <KPICard
      title="Total Rewards"
      value={`$${total.toLocaleString()}`}
      subtitle={
        comparison
          ? `vs $${comparison.rewards.total.toLocaleString()} (${delta(total, comparison.rewards.total)})`
          : `${metrics.rewards.count} achievements`
      }
      highlight="green"
    />
  );
}

function NetBalanceTile({ metrics, comparison }: TileProps) {
  const netBalance = metrics.rewards.total - metrics.penalties.total;
  return (
    <KPICard
      title="Net Balance"
      value={`${netBalance >= 0 ? "+" : ""}$${netBalance.toLocaleString()}`}
      subtitle={(() => {
        if (!comparison) return "Rewards minus penalties";
        const cmpNet = comparison.rewards.total - comparison.penalties.total;
        return `vs ${cmpNet >= 0 ? "+" : ""}$${cmpNet.toLocaleString()} (${delta(netBalance, cmpNet)})`;
      })()}
      highlight={netBalance >= 0 ? "green" : "red"}
    />
  );
}

export default function SLADashboardView() {
  const router = useRouter();
  const [compareMode, setCompareMode] = useState(false);
  const [filters, setFilters] = useState<DashboardFilters>({});

  function set(key: keyof DashboardFilters, value: string) {
    setFilters((f) => ({ ...f, [key]: value || undefined }));
  }

  // Issue #605 — the primary metrics query is the persisted one: it keys into
  // the shared factory, writes successful snapshots to IndexedDB, and hydrates
  // them on mount so the landing page survives an offline reload.
  const primary = useDashboardMetrics(filters);
  const retryMetrics = useCallback(() => void primary.refetch(), [primary]);

  const trends = useQuery<TrendPoint[], Error>({
    queryKey: slaEventKeys.dashboardTrends(filters),
    queryFn: () => fetchDashboardTrends(filters),
    staleTime: 30_000,
  });

  const hasDateRange = useMemo(
    () => Boolean(filters.date_from || filters.date_to),
    [filters.date_from, filters.date_to],
  );

  const comparisonFilters = useMemo(() => computeComparisonFilters(filters), [filters]);

  // Comparison mode is only meaningful with a primary date range: the flag is
  // derived at render time so a cleared range disables the comparison query
  // and its UI immediately, without effect-based setState
  // (react-hooks/set-state-in-effect).
  const compareModeActive = compareMode && hasDateRange;

  const secondary = useQuery<DashboardMetrics>({
    queryKey: slaEventKeys.dashboardCompare(comparisonFilters),
    queryFn: () => fetchDashboardMetrics(comparisonFilters),
    staleTime: 30_000,
    enabled: compareModeActive,
  });

  const onTrendClick = useCallback((point: TrendPoint) => {
    const params = new URLSearchParams();
    if (point.period) params.set("date_from", point.period);
    if (filters.severity) params.set("severity", filters.severity);
    if (filters.site) params.set("site", filters.site);
    router.push(`/outages?${params.toString()}`);
  }, [router, filters.severity, filters.site]);

  const onPenaltyClick = useCallback((point: TrendPoint) => {
    const params = new URLSearchParams();
    if (point.period) params.set("date_from", point.period);
    params.set("type", "penalty");
    router.push(`/payments?${params.toString()}`);
  }, [router]);

  const onRewardClick = useCallback((point: TrendPoint) => {
    const params = new URLSearchParams();
    if (point.period) params.set("date_from", point.period);
    params.set("type", "reward");
    router.push(`/payments?${params.toString()}`);
  }, [router]);

  if (primary.isLoading && !primary.data) {
    return (
      <RouteLoadingState
        title="Loading dashboard"
        description="Pulling the latest SLA compliance, trends, and payout metrics."
      />
    );
  }

  // With no data at all there is nothing to isolate — hand off to the route
  // error state. A snapshot-backed render falls through to the tiles below and
  // is flagged as stale instead.
  if (!primary.data) {
    return (
      <RouteErrorState
        title="Dashboard unavailable"
        description="We could not load the latest analytics right now."
        primaryAction={{ label: "Retry", onClick: retryMetrics }}
      />
    );
  }

  const metrics = primary.data;
  const lastUpdated = primary.dataUpdatedAt
    ? new Date(primary.dataUpdatedAt).toLocaleString()
    : "Not synced yet";
  const cmp = compareModeActive && secondary.data ? secondary.data : null;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-800">SLA Analytics Dashboard</h1>
          <p className="text-sm text-gray-500">Live backend analytics for compliance, payouts, and trend movement.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/*
            Issue #605 — the tiles below come from the persisted snapshot rather
            than a live request, so say so instead of presenting it as current.
          */}
          {primary.isStaleSnapshot ? (
            <span
              data-testid="dashboard-snapshot-badge"
              className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800"
            >
              Cached snapshot
            </span>
          ) : null}
          <span className="text-xs uppercase tracking-wide text-gray-600">Updated {lastUpdated}</span>
        <button
          onClick={() => setCompareMode((v) => !v)}
          disabled={!hasDateRange}
          title={hasDateRange ? undefined : "Select a date range to enable comparison"}
          aria-pressed={compareModeActive}
          className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${compareModeActive ? "border-blue-400 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
        >
          {compareModeActive ? "Exit Compare" : "Compare"}
        </button>
          <button onClick={() => exportSnapshot(metrics)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50">Export</button>
          <button onClick={retryMetrics} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50">Refresh</button>
        </div>
      </div>

      {compareModeActive && secondary.isLoading ? (
        <p className="text-sm text-gray-400">Loading comparison window…</p>
      ) : null}

      <Card data-tour="dashboard-filters">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
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
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" data-tour="dashboard-kpis">
        <MetricErrorBoundary title="SLA Compliance" onRetry={retryMetrics}>
          <ComplianceTile metrics={metrics} comparison={cmp} />
        </MetricErrorBoundary>
        <MetricErrorBoundary title="Total Penalties" onRetry={retryMetrics}>
          <PenaltiesTile metrics={metrics} comparison={cmp} />
        </MetricErrorBoundary>
        <MetricErrorBoundary title="Total Rewards" onRetry={retryMetrics}>
          <RewardsTile metrics={metrics} comparison={cmp} />
        </MetricErrorBoundary>
        <MetricErrorBoundary title="Net Balance" onRetry={retryMetrics}>
          <NetBalanceTile metrics={metrics} comparison={cmp} />
        </MetricErrorBoundary>
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

      {compareModeActive && cmp && cmp.trends.length === 0 ? (
        <p className="rounded-lg bg-yellow-50 px-4 py-2 text-sm text-yellow-700">No data available for the comparison window.</p>
      ) : null}
    </div>
  );
}
