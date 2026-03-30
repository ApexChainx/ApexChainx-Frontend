"use client";

import { useEffect, useState } from "react";

import { RouteErrorState, RouteLoadingState } from "@/components/ui/route-state";
import { fetchPayment } from "@/services/paymentService";
import type { Payment } from "@/types/payment";

const statusStyles: Record<string, string> = {
  completed: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  failed: "bg-red-100 text-red-700",
  confirmed: "bg-emerald-100 text-emerald-700",
};

interface Props {
  paymentId: string | null;
  onClose: () => void;
}

export function PaymentDetailDrawer({ paymentId, onClose }: Props) {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!paymentId) {
      setPayment(null);
      return;
    }
    let isMounted = true;
    setLoading(true);
    setError(null);
    fetchPayment(paymentId)
      .then((data) => { if (isMounted) setPayment(data); })
      .catch(() => { if (isMounted) setError("Failed to load payment details."); })
      .finally(() => { if (isMounted) setLoading(false); });
    return () => { isMounted = false; };
  }, [paymentId]);

  if (!paymentId) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Payment Details</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl leading-none"
            aria-label="Close drawer"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <RouteLoadingState
              title="Loading payment"
              description="Fetching transaction metadata."
            />
          )}
          {error && (
            <RouteErrorState
              title="Error"
              description={error}
              actionLabel="Retry"
              onAction={() => {
                setError(null);
                setLoading(true);
                fetchPayment(paymentId!)
                  .then(setPayment)
                  .catch(() => setError("Failed to load payment details."))
                  .finally(() => setLoading(false));
              }}
            />
          )}
          {!loading && !error && payment && (
            <dl className="space-y-4 text-sm">
              <Row label="Payment ID" value={payment.id} mono />
              <Row label="Outage ID" value={payment.outage_id} mono />
              <Row
                label="Type"
                value={
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${payment.type === "penalty" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                    {payment.type}
                  </span>
                }
              />
              <Row
                label="Amount"
                value={
                  <span className={`font-semibold ${payment.type === "penalty" ? "text-red-600" : "text-green-600"}`}>
                    {payment.type === "penalty" ? "-" : "+"}${payment.amount.toLocaleString()} {payment.asset_code}
                  </span>
                }
              />
              <Row
                label="Status"
                value={
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${statusStyles[payment.status] ?? "bg-gray-100 text-gray-500"}`}>
                    {payment.status}
                  </span>
                }
              />
              <Row label="From" value={payment.from_address} mono />
              <Row label="To" value={payment.to_address} mono />
              <Row label="Transaction Hash" value={payment.transaction_hash} mono />
              <Row label="Created" value={new Date(payment.created_at).toLocaleString()} />
              {payment.confirmed_at && (
                <Row label="Confirmed" value={new Date(payment.confirmed_at).toLocaleString()} />
              )}
            </dl>
          )}
        </div>
      </aside>
    </>
  );
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-100 pb-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={`break-all text-slate-900 ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}
