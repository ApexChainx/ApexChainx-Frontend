"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type ToastVariant = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const toast = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const variantClass: Record<ToastVariant, string> = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    error: "border-red-200 bg-red-50 text-red-700",
    info: "border-slate-200 bg-white text-slate-800",
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Issue #537 — exactly ONE polite live region announces toasts to
          assistive tech. Multiple per-toast role="alert"/aria-live regions
          compete, interleave, and can make screen readers announce the whole
          stale stack on each new toast. This single region announces only
          the newest message and stays polite. */}
      <div
        role="log"
        aria-live="polite"
        aria-atomic="true"
        aria-label="Notifications"
        className="sr-only"
      >
        {toasts.length > 0 ? toasts[toasts.length - 1]!.message : null}
      </div>

      {/* Visual stack — presentational only, no live-region semantics. */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-3 text-sm shadow-md ${variantClass[t.variant]}`}
          >
            <span>{t.message}</span>
            <button
              aria-label="Dismiss"
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="shrink-0 opacity-60 hover:opacity-100"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx.toast;
}
