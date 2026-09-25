"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RouteEmptyState, RouteErrorState, RouteLoadingState } from "@/components/ui/route-state";
import { fetchPayments, retryPayment } from "@/services/paymentService";
import type { PaginatedPayments, Payment, PaymentStatus } from "@/types/payment";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const statusStyles: Record<string, string> = {
  failed: "bg-red-100 text-red-700",
  pending: "bg-yellow-100 text-yellow-700",
};

const typeStyles: Record<string, string> = {
  reward: "bg-blue-100 text-blue-700",
  penalty: "bg-red-100 text-red-700",
};

/** Status a row shows while its retry request is in flight. */
const OPTIMISTIC_PENDING_STATUS: PaymentStatus = "pending";

export default function RetryQueueView() {
  const [data, setData] = useState<PaginatedPayments | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());
  const [optimisticStatus, setOptimisticStatus] = useState<Record<string, PaymentStatus>>({});
  const [retryError, setRetryError] = useState<string | null>(null);
  const [bulkRetrying, setBulkRetrying] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Tracks in-flight retries synchronously so a double-click cannot issue a duplicate request
  // (the disabled button state only lands after React re-renders).
  const inFlightRef = useRef<Set<string>>(new Set());

  // Calculate date 7 days ago for default filter
  const getSevenDaysAgo = () => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  };

  const dateFrom = getSevenDaysAgo();

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetchPayments({
      page: 1,
      page_size: 100,
      status: "failed",
      date_from: dateFrom,
    })
      .then((response) => { if (isMounted) { setData(response); setError(null); } })
      .catch(() => { if (isMounted) setError("Failed to load failed payments."); })
      .finally(() => { if (isMounted) setLoading(false); });
    return () => { isMounted = false; };
  }, [refreshKey, dateFrom]);

  /** Overlay a status on rows without touching the fetched payload. Passing null reverts. */
  const applyOptimisticStatus = useCallback((ids: string[], status: PaymentStatus | null) => {
    setOptimisticStatus((prev) => {
      const next = { ...prev };
      for (const id of ids) {
        if (status === null) {
          delete next[id];
        } else {
          next[id] = status;
        }
      }
      return next;
    });
  }, []);

  const rowStatus = (payment: Payment) => optimisticStatus[payment.id] ?? payment.status;

  const handleRetry = async (id: string) => {
    if (inFlightRef.current.has(id)) return;

    inFlightRef.current.add(id);
    setRetryError(null);
    setRetryingIds((prev) => new Set(prev).add(id));
    // Flip the row to pending immediately, before the request resolves.
    applyOptimisticStatus([id], OPTIMISTIC_PENDING_STATUS);

    try {
      const updated = await retryPayment(id);
      // Reconcile with the server response, falling back to the optimistic status.
      applyOptimisticStatus([id], updated?.status ?? OPTIMISTIC_PENDING_STATUS);
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      // Retry-error fallback: drop the optimistic state so the row reverts to failed.
      applyOptimisticStatus([id], null);
      setRetryError(`Could not retry payment ${id}. Please try again.`);
      console.error("Failed to retry payment:", err);
    } finally {
      inFlightRef.current.delete(id);
      setRetryingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const handleBulkRetry = async () => {
    const ids = Array.from(selectedIds).filter((id) => !inFlightRef.current.has(id));
    if (ids.length === 0) {
      setShowConfirmDialog(false);
      return;
    }

    ids.forEach((id) => inFlightRef.current.add(id));
    setBulkRetrying(true);
    setRetryError(null);
    applyOptimisticStatus(ids, OPTIMISTIC_PENDING_STATUS);

    try {
      const results = await Promise.allSettled(ids.map((id) => retryPayment(id)));
      const failedIds: string[] = [];

      results.forEach((result, index) => {
        const id = ids[index]!;
        if (result.status === "fulfilled") {
          applyOptimisticStatus([id], result.value?.status ?? OPTIMISTIC_PENDING_STATUS);
        } else {
          failedIds.push(id);
        }
      });

      if (failedIds.length > 0) {
        applyOptimisticStatus(failedIds, null);
        setRetryError(
          `Could not retry ${failedIds.length} of ${ids.length} payments. Please try again.`,
        );
      } else {
        setSelectedIds(new Set());
      }

      setRefreshKey((prev) => prev + 1);
    } finally {
      ids.forEach((id) => inFlightRef.current.delete(id));
      setBulkRetrying(false);
      setShowConfirmDialog(false);
    }
  };

  const toggleSelectAll = () => {
    if (!data) return;
    if (selectedIds.size === data.items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.items.map(item => item.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const cell = "px-4 py-3 text-sm";

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Payment Retry Queue</h1>
          <p className="text-sm text-gray-600 mt-1">Failed payments from the last 7 days</p>
        </div>
        {selectedIds.size > 0 && (
          <Button 
            onClick={() => setShowConfirmDialog(true)}
            disabled={bulkRetrying}
          >
            {bulkRetrying ? "Retrying..." : `Bulk Retry (${selectedIds.size})`}
          </Button>
        )}
      </div>

      {retryError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {retryError}
        </div>
      )}

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-gray-50">
            <tr>
              <th className={`${cell} text-xs font-semibold uppercase tracking-wide text-gray-500 w-12`}>
                <input 
                  type="checkbox" 
                  checked={data ? selectedIds.size === data.items.length && data.items.length > 0 : false}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300"
                />
              </th>
              <th className={`${cell} text-xs font-semibold uppercase tracking-wide text-gray-500`}>Outage</th>
              <th className={`${cell} text-xs font-semibold uppercase tracking-wide text-gray-500`}>Type</th>
              <th className={`${cell} text-xs font-semibold uppercase tracking-wide text-gray-500`}>Amount</th>
              <th className={`${cell} text-xs font-semibold uppercase tracking-wide text-gray-500`}>Date</th>
              <th className={`${cell} text-xs font-semibold uppercase tracking-wide text-gray-500`}>Asset</th>
              <th className={`${cell} text-xs font-semibold uppercase tracking-wide text-gray-500`}>Status</th>
              <th className={`${cell} text-xs font-semibold uppercase tracking-wide text-gray-500`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="p-0">
                <RouteLoadingState title="Loading failed payments" description="Retrieving payments that need to be retried." />
              </td></tr>
            ) : error ? (
              <tr><td colSpan={8} className="p-0">
                <RouteErrorState title="Payments unavailable" description={error} primaryAction={{ label: "Reload page", onClick: () => window.location.reload() }} />
              </td></tr>
            ) : !data || data.items.length === 0 ? (
              <tr><td colSpan={8} className="p-0">
                <RouteEmptyState title="No failed payments" description="There are no failed payments from the last 7 days." />
              </td></tr>
            ) : data.items.map((payment: Payment) => {
              const status = rowStatus(payment);
              const isRetrying = retryingIds.has(payment.id);

              return (
              <tr
                key={payment.id}
                className="border-t transition-colors hover:bg-gray-50"
                aria-busy={isRetrying}
              >
                <td className={cell}>
                  <input 
                    type="checkbox" 
                    checked={selectedIds.has(payment.id)}
                    onChange={() => toggleSelect(payment.id)}
                    className="rounded border-gray-300"
                  />
                </td>
                <td className={`${cell} font-mono text-gray-700`}>
                  {payment.outage_id ? (
                    <Link
                      href={`/outages/${payment.outage_id}`}
                      className="text-blue-600 hover:underline underline-offset-2"
                    >
                      {payment.outage_id}
                    </Link>
                  ) : (
                    <span className="italic text-gray-400">—</span>
                  )}
                </td>
                <td className={cell}>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${typeStyles[payment.type]}`}>
                    {payment.type}
                  </span>
                </td>
                <td className={`${cell} font-semibold ${payment.type === "penalty" ? "text-red-700" : "text-green-700"}`}>
                  {payment.type === "penalty" ? "-" : "+"}${payment.amount.toLocaleString()}
                </td>
                <td className={`${cell} text-gray-600`}>
                  {new Date(payment.created_at).toLocaleDateString()}
                </td>
                <td className={`${cell} font-mono text-gray-500`}>{payment.asset_code}</td>
                <td className={cell}>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${statusStyles[status] ?? "bg-gray-100 text-gray-500"}`}>
                    {status}
                  </span>
                </td>
                <td className={cell}>
                  <Button
                    size="sm"
                    onClick={() => handleRetry(payment.id)}
                    disabled={isRetrying}
                  >
                    {isRetrying ? "Retrying..." : "Retry"}
                  </Button>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Bulk Retry</DialogTitle>
            <DialogDescription>
              Are you sure you want to retry {selectedIds.size} payment{selectedIds.size > 1 ? 's' : ''}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowConfirmDialog(false)} disabled={bulkRetrying}>
              Cancel
            </Button>
            <Button onClick={handleBulkRetry} disabled={bulkRetrying}>
              {bulkRetrying ? "Retrying..." : "Confirm Retry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
