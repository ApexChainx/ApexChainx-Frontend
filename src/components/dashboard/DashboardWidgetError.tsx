"use client";
/** ApexChain Network Operations Intelligence Platform */

import { ApiError, normalizeApiError } from "@/lib/errors";

/**
 * Issue #606 — when one dashboard widget fails, the operator gets a localized
 * failure with two things the route-level error card never offered:
 *
 *  - the backend correlation id, so the incident can be handed to support
 *    without them having to reproduce it, and
 *  - a Retry that re-runs only this widget's query, leaving the sibling tiles
 *    and charts on screen instead of forcing a full reload.
 */

function correlationIdOf(error: unknown): string | undefined {
  if (!error) return undefined;
  if (error instanceof ApiError) return error.correlationId;
  return normalizeApiError(error).correlationId;
}

export interface DashboardWidgetErrorProps {
  /** Widget name, used in the heading and the retry button's accessible name. */
  title: string;
  error: unknown;
  onRetry: () => void;
  isRetrying?: boolean;
  className?: string;
}

export function DashboardWidgetError({
  title,
  error,
  onRetry,
  isRetrying = false,
  className = "",
}: DashboardWidgetErrorProps) {
  const correlationId = correlationIdOf(error);
  const message =
    error instanceof ApiError
      ? error.message
      : normalizeApiError(error).message;

  return (
    <div
      role="alert"
      data-testid="dashboard-widget-error"
      data-widget={title}
      className={`flex h-full flex-col items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-5 text-sm ${className}`}
    >
      <p className="font-semibold text-red-700">{title} unavailable</p>
      <p className="text-red-600">{message}</p>

      {correlationId ? (
        <p className="text-xs text-red-500">
          Ref ID: <span className="font-mono">{correlationId}</span>
        </p>
      ) : null}

      <button
        type="button"
        onClick={onRetry}
        disabled={isRetrying}
        aria-label={`Retry ${title}`}
        className="mt-1 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 disabled:opacity-50"
      >
        {isRetrying ? "Retrying…" : "Retry"}
      </button>
    </div>
  );
}

export default DashboardWidgetError;
