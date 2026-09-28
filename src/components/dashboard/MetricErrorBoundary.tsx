"use client";
/** ApexChain Network Operations Intelligence Platform */

import {
  Component,
  useEffect,
  useRef,
  type ErrorInfo,
  type ReactNode,
} from "react";

/**
 * Issue #607 — the dashboard relied on the route-level `error.tsx`, so a
 * single tile that failed to render (a malformed metric, a bad formatter)
 * blanked the whole page shell even though the rest of the dashboard was
 * healthy. Each metric card is wrapped in this boundary instead: the offender
 * renders a localized fallback and its siblings stay interactive.
 *
 * The fallback is a real `<button>`, focused when it appears, so an operator
 * navigating by keyboard can retry without hunting for the control.
 */

export interface MetricErrorBoundaryProps {
  /** Widget name — used in the fallback heading and the retry button's label. */
  title: string;
  children: ReactNode;
  /** Re-runs the widget's data source when the operator retries. */
  onRetry?: () => void;
  className?: string;
}

interface MetricErrorBoundaryState {
  error: Error | null;
}

function MetricErrorFallback({
  title,
  message,
  onRetry,
  className = "",
}: {
  title: string;
  message: string;
  onRetry: () => void;
  className?: string;
}) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  // Surface the recovery control to keyboard and screen-reader users as soon
  // as the fallback replaces the tile.
  useEffect(() => {
    buttonRef.current?.focus();
  }, []);

  return (
    <div
      role="alert"
      data-testid="metric-error-boundary"
      data-metric={title}
      className={`flex h-full flex-col items-start justify-center gap-1 rounded-xl border-l-4 border-red-600 bg-red-50 p-5 shadow-sm dark:bg-red-900/30 ${className}`}
    >
      <p className="text-sm font-medium text-red-800 dark:text-red-300">
        {title} unavailable
      </p>
      <p className="text-xs text-red-600 dark:text-red-400">{message}</p>
      <button
        ref={buttonRef}
        type="button"
        onClick={onRetry}
        aria-label={`Retry ${title}`}
        className="mt-2 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
      >
        Retry
      </button>
    </div>
  );
}

export class MetricErrorBoundary extends Component<
  MetricErrorBoundaryProps,
  MetricErrorBoundaryState
> {
  state: MetricErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): MetricErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(
      `[dashboard] metric "${this.props.title}" failed to render`,
      error,
      info.componentStack,
    );
  }

  private handleRetry = (): void => {
    // Clear the error first so the children get another chance to render, then
    // let the owner refresh the underlying widget.
    this.setState({ error: null });
    this.props.onRetry?.();
  };

  render(): ReactNode {
    const { error } = this.state;
    if (error) {
      return (
        <MetricErrorFallback
          title={this.props.title}
          message={error.message || "This metric could not be displayed."}
          onRetry={this.handleRetry}
          className={this.props.className}
        />
      );
    }

    return this.props.children;
  }
}

export default MetricErrorBoundary;
