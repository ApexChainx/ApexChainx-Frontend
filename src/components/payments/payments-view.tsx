"use client";
/** ApexChain Network Operations Intelligence Platform */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { PaymentDetailDrawer } from "@/components/payments/payment-detail-drawer";
import { PaymentsTable, type SortDir, type SortKey } from "@/components/payments/payments-table";
import type { TableDensity } from "@/components/data-table";
import { exportPayments } from "@/services/paymentService";
import { getPreferences, hydratePreferences, subscribeToPreferences, updatePreferences } from "@/lib/preferences";
import { usePayments } from "@/features/payments/hooks/usePayments";
import type { PaginatedPayments } from "@/types/payment";

/**
 * Pages larger than the table's virtualization threshold render as a windowed list
 * instead of mounting every row.
 */
const ROWS_PER_PAGE_OPTIONS = [10, 100, 500] as const;

export default function PaymentsView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // FE-069: filter state
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // FE-072: sort + density
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [density, setDensity] = useState<TableDensity>(() => {
    const prefs = getPreferences();
    return prefs.tableDensity || "default";
  });

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(
    () => searchParams?.get("paymentId") ?? null
  );
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Sync drawer open/close with URL
  function openDrawer(id: string) {
    setSelectedPaymentId(id);
    router.replace(`/payments?paymentId=${id}`, { scroll: false });
  }
  function closeDrawer() {
    setSelectedPaymentId(null);
    router.replace("/payments", { scroll: false });
  }

  // Hydrate preferences from server and subscribe to changes
  useEffect(() => {
    hydratePreferences().then((prefs) => {
      setDensity(prefs.tableDensity || "default");
    });

    return subscribeToPreferences((prefs) => {
      setDensity(prefs.tableDensity || "default");
    });
  }, []);

  // Update density in preferences when changed
  const handleDensityChange = (newDensity: TableDensity) => {
    setDensity(newDensity);
    updatePreferences({ tableDensity: newDensity });
  };

  const handlePerPageChange = (nextPerPage: number) => {
    setPerPage(nextPerPage);
    setPage(1);
  };

  const { data, isLoading, isError, error: queryError, refetch } = usePayments({
    page,
    page_size: perPage,
    status: statusFilter || undefined,
    type: typeFilter || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    sort_by: sortKey,
    sort_dir: sortDir,
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / perPage)) : 1;

  async function handleExport() {
    setExporting(true);
    setExportError(null);
    try {
      await exportPayments({
        status: statusFilter || undefined,
        type: typeFilter || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
    } catch {
      setExportError("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  const loading = isLoading;
  const error = isError ? (queryError?.message ?? "Failed to load payments.") : null;

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800">Payments</h1>
          <Link
            href="/payments/retry-queue"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            Retry Queue
          </Link>
        </div>
        <div className="flex items-center gap-3">
          {exportError && <span className="text-xs text-red-600">{exportError}</span>}
          <button
            onClick={() => void handleExport()}
            disabled={exporting}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
          {/* FE-072: density toggle */}
          <div className="flex items-center gap-1 text-xs text-slate-600">
            <span className="font-medium">Density:</span>
            {(["default", "compact"] as TableDensity[]).map((d) => (
              <button
                key={d}
                  onClick={() => handleDensityChange(d as TableDensity)}
                  className={`rounded px-2 py-0.5 capitalize border ${density === d ? "bg-slate-800 text-white border-slate-800" : "border-slate-200 hover:bg-slate-100"}`}
              >
                {d}
              </button>
            ))}
          </div>
          {/* Rows per page: larger pages exercise the table's virtualization window */}
          <label className="flex items-center gap-1 text-xs text-slate-600">
            <span className="font-medium">Rows:</span>
            <select
              className="rounded border border-slate-200 bg-white px-2 py-1 text-xs"
              value={perPage}
              onChange={(e) => handlePerPageChange(Number(e.target.value))}
              aria-label="Rows per page"
            >
              {ROWS_PER_PAGE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* FE-069: filter bar */}
      <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4" data-tour="payments-filters">
        <label className="space-y-1 text-xs">
          <span className="font-medium text-slate-600">Status</span>
          <select
            className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-sm"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="confirmed">Confirmed</option>
            <option value="failed">Failed</option>
          </select>
        </label>
        <label className="space-y-1 text-xs">
          <span className="font-medium text-slate-600">Type</span>
          <select
            className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-sm"
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          >
            <option value="">All</option>
            <option value="reward">Reward</option>
            <option value="penalty">Penalty</option>
          </select>
        </label>
        <label className="space-y-1 text-xs">
          <span className="font-medium text-slate-600">From</span>
          <input
            type="date"
            className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-sm"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="font-medium text-slate-600">To</span>
          <input
            type="date"
            className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-sm"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          />
        </label>
      </div>

      <PaymentsTable
        items={data?.items ?? []}
        density={density}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={toggleSort}
        onRowClick={openDrawer}
        loading={loading}
        error={error}
        onReload={() => window.location.reload()}
      />

      {data && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Page {page} of {totalPages} — {data.total} total</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg border px-3 py-1.5 transition-colors hover:bg-gray-100 disabled:opacity-40">Previous</button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-lg border px-3 py-1.5 transition-colors hover:bg-gray-100 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}

      <PaymentDetailDrawer
        paymentId={selectedPaymentId}
        onClose={closeDrawer}
      />
    </div>
  );
}
