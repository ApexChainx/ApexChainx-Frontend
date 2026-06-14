"use client";
/** ApexChain Network Operations Intelligence Platform */

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";

import { RouteErrorState, RouteLoadingState } from "@/components/ui/route-state";
import { useToast } from "@/components/ui/toast";
import { explorerLink } from "@/lib/explorer";
import { fetchPayment, retryPayment, reconcilePayment } from "@/services/paymentService";
import type { Payment } from "@/types/payment";

// ─── Constants ───────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  completed: "bg-green-100 text-green-700 border-green-200",
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  failed: "bg-red-100 text-red-700 border-red-200",
  confirmed: "bg-emerald-100 text-emerald-700 border-emerald-200",
} as const;

const PAYMENT_TYPE_STYLES = {
  penalty: "bg-red-100 text-red-700 border-red-200",
  reward: "bg-blue-100 text-blue-700 border-blue-200",
  standard: "bg-slate-100 text-slate-700 border-slate-200",
} as const;

// ─── Types ───────────────────────────────────────────────────────────────────
type ActionType = "retry" | "reconcile";

interface ActionState {
  type: ActionType;
  status: "loading" | "success" | "error";
  message?: string;
}

interface Props {
  paymentId: string | null;
  onClose: () => void;
}

// ─── Utility Components ──────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-gray-100 text-gray-500 border-gray-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${style}`}>
      {status}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const style = PAYMENT_TYPE_STYLES[type as keyof typeof PAYMENT_TYPE_STYLES] ?? PAYMENT_TYPE_STYLES.standard;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${style}`}>
      {type}
    </span>
  );
}

function ExplorerLink({ 
  type, 
  value, 
  label 
}: { 
  type: "account" | "tx"; 
  value: string | null; 
  label?: string 
}) {
  if (!value) return <span className="font-mono text-xs text-slate-400">—</span>;
  
  const link = explorerLink(type, value);
  const display = label ?? value;
  
  if (!link) {
    return <span className="font-mono text-xs break-all">{display}</span>;
  }

  return (
    <a 
      href={link} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="inline-flex items-center gap-1 font-mono text-xs text-blue-600 hover:text-blue-800 hover:underline break-all transition-colors"
    >
      {display}
      <svg className="h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5 border-b border-slate-100 pb-3 last:border-0">
      <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className={`break-all text-slate-900 leading-relaxed ${mono ? "font-mono text-xs" : "text-sm"}`}>
        {value}
      </dd>
    </div>
  );
}

function ActionAlert({ state }: { state: ActionState }) {
  if (state.status === "success") {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 animate-in fade-in slide-in-from-top-1 duration-200" role="status">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {state.message}
        </div>
      </div>
    );
  }
  
  if (state.status === "error") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 animate-in fade-in slide-in-from-top-1 duration-200" role="alert">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {state.message}
        </div>
      </div>
    );
  }
  
  return null;
}

// ─── Main Component ──────────────────────────────────────────────────────────
export function PaymentDetailDrawer({ paymentId, onClose }: Props) {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionState, setActionState] = useState<ActionState | null>(null);
  
  const toast = useToast();
  const abortRef = useRef<AbortController | null>(null);

  // ─── Data Fetching ─────────────────────────────────────────────────────────
  const loadPayment = useCallback(async (id: string, signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    setActionState(null);
    
    try {
      const data = await fetchPayment(id, signal);
      setPayment(data);
    } catch (err: unknown) {
      if ((err as { name?: string }).name === "CanceledError" || (err as { name?: string }).name === "AbortError") {
        return; // Silently ignore aborts
      }
      setError(err instanceof Error ? err.message : "Failed to load payment details.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!paymentId) {
      setPayment(null);
      setError(null);
      setActionState(null);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    
    void loadPayment(paymentId, controller.signal);
    
    return () => {
      controller.abort();
      abortRef.current = null;
    };
  }, [paymentId, loadPayment]);

  // ─── Actions ───────────────────────────────────────────────────────────────
  const handleAction = useCallback(async (type: ActionType) => {
    if (!payment) return;
    
    setActionState({ type, status: "loading" });
    
    try {
      const updated = type === "retry"
        ? await retryPayment(payment.id)
        : await reconcilePayment(payment.id);
      
      setPayment(updated);
      const message = `${type === "retry" ? "Retry" : "Reconciliation"} succeeded.`;
      
      setActionState({ type, status: "success", message });
      toast(message, "success");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : `${type} failed. Please try again.`;
      setActionState({ type, status: "error", message });
      toast(message, "error");
    }
  }, [payment, toast]);

  const handleRetryLoad = useCallback(() => {
    if (!paymentId) return;
    const controller = new AbortController();
    abortRef.current = controller;
    void loadPayment(paymentId, controller.signal);
  }, [paymentId, loadPayment]);

  // ─── Keyboard & Focus Management ───────────────────────────────────────────
  useEffect(() => {
    if (!paymentId) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [paymentId, onClose]);

  // Focus trap ref
  const drawerRef = useRef<HTMLElement>(null);
  
  useEffect(() => {
    if (paymentId && drawerRef.current) {
      const focusable = drawerRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusable?.focus();
    }
  }, [paymentId]);

  if (!paymentId) return null;

  const isActionLoading = actionState?.status === "loading";
  const amountPrefix = payment?.type === "penalty" ? "-" : "+";
  const amountColor = payment?.type === "penalty" ? "text-red-600" : "text-green-600";

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-200" 
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Drawer */}
      <aside 
        ref={drawerRef}
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-300 ease-out"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-white">
          <h2 id="drawer-title" className="text-lg font-semibold text-slate-900">
            Payment Details
          </h2>
          <button 
            onClick={onClose} 
            className="rounded-lg p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Close drawer"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="py-8">
              <RouteLoadingState title="Loading payment" description="Fetching transaction metadata..." />
            </div>
          )}
          
          {error && (
            <RouteErrorState
              title="Failed to load"
              description={error}
              actionLabel="Try Again"
              onAction={handleRetryLoad}
            />
          )}
          
          {!loading && !error && payment && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <dl className="space-y-4">
                <DetailRow label="Payment ID" value={payment.id} mono />
                
                <DetailRow
                  label="Outage"
                  value={
                    payment.outage_id ? (
                      <Link 
                        href={`/outages/${payment.outage_id}`} 
                        className="inline-flex items-center gap-1 font-mono text-xs text-blue-600 hover:text-blue-800 hover:underline underline-offset-2 transition-colors"
                      >
                        {payment.outage_id}
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    ) : (
                      <span className="italic text-slate-400">No linked outage</span>
                    )
                  }
                />
                
                <DetailRow label="Type" value={<TypeBadge type={payment.type} />} />
                
                <DetailRow
                  label="Amount"
                  value={
                    <span className={`text-lg font-bold ${amountColor}`}>
                      {amountPrefix}${payment.amount.toLocaleString()} {payment.asset_code}
                    </span>
                  }
                />
                
                <DetailRow label="Status" value={<StatusBadge status={payment.status} />} />
                
                <DetailRow 
                  label="From" 
                  value={<ExplorerLink type="account" value={payment.from_address} />} 
                />
                
                <DetailRow 
                  label="To" 
                  value={<ExplorerLink type="account" value={payment.to_address} />} 
                />
                
                <DetailRow 
                  label="Transaction Hash" 
                  value={<ExplorerLink type="tx" value={payment.transaction_hash} />} 
                />
                
                <DetailRow 
                  label="Created" 
                  value={
                    <time dateTime={payment.created_at}>
                      {new Date(payment.created_at).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </time>
                  } 
                />
                
                {payment.confirmed_at && (
                  <DetailRow 
                    label="Confirmed" 
                    value={
                      <time dateTime={payment.confirmed_at}>
                        {new Date(payment.confirmed_at).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </time>
                    } 
                  />
                )}
              </dl>

              {/* Actions */}
              <div className="space-y-3 border-t border-slate-200 pt-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Actions
                </p>
                
                {actionState && <ActionAlert state={actionState} />}
                
                <div className="flex gap-3">
                  <ActionButton
                    type="retry"
                    onClick={() => handleAction("retry")}
                    loading={isActionLoading && actionState?.type === "retry"}
                    disabled={isActionLoading}
                    variant="primary"
                  />
                  <ActionButton
                    type="reconcile"
                    onClick={() => handleAction("reconcile")}
                    loading={isActionLoading && actionState?.type === "reconcile"}
                    disabled={isActionLoading}
                    variant="secondary"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────────────

function ActionButton({ 
  type, 
  onClick, 
  loading, 
  disabled, 
  variant 
}: { 
  type: ActionType;
  onClick: () => void;
  loading: boolean;
  disabled: boolean;
  variant: "primary" | "secondary";
}) {
  const baseStyles = "flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2";
  
  const variants = {
    primary: "border border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 focus:ring-blue-500",
    secondary: "border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 focus:ring-slate-500",
  };

  const labels = {
    retry: { idle: "Retry Payment", loading: "Retrying..." },
    reconcile: { idle: "Reconcile", loading: "Reconciling..." },
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]}`}
    >
      {loading && (
        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {loading ? labels[type].loading : labels[type].idle}
    </button>
  );
}