"use client";
/** ApexChain Network Operations Intelligence Platform */

import { useEffect, useState } from "react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmPhrase: string;
  confirmLabel: string;
  loading?: boolean;
  variant?: "primary" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Modal confirmation that requires typing `confirmPhrase`.
 *
 * The interactive content is a separate component mounted only while the
 * dialog is open, so the typed value resets on every open via remounting
 * instead of an effect-based setState.
 */
export function ConfirmDialog({
  isOpen,
  ...rest
}: ConfirmDialogProps) {
  if (!isOpen) return null;
  return <ConfirmDialogSurface {...rest} />;
}

function ConfirmDialogSurface({
  title,
  message,
  confirmPhrase,
  confirmLabel,
  loading = false,
  variant = "primary",
  onConfirm,
  onCancel,
}: Omit<ConfirmDialogProps, "isOpen">) {
  const [typedValue, setTypedValue] = useState("");

  const isMatch = typedValue.trim() === confirmPhrase;

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [loading, onCancel]);

  const buttonClasses =
    variant === "danger"
      ? "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
      : "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl animate-in zoom-in-95 duration-200">
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm text-slate-600">{message}</p>

        <div className="mt-4 space-y-2">
          <label className="block text-xs font-medium text-slate-700">
            Type <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs text-slate-800">{confirmPhrase}</code> to confirm:
          </label>
          <input
            autoFocus
            type="text"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            value={typedValue}
            onChange={(e) => setTypedValue(e.target.value)}
            placeholder={confirmPhrase}
            disabled={loading}
            autoComplete="off"
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!isMatch || loading}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${buttonClasses}`}
          >
            {loading ? "Processing…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
