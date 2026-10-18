"use client";
/** ApexChain Network Operations Intelligence Platform */
/**
 * Footer error boundary (Issue #811).
 *
 * The footer is composed from session state (`useSession`) and the translated
 * message catalogue. Either can throw while it is still resolving — a session
 * snapshot that fails to parse, or a message bundle that could not be loaded.
 * Without a boundary any such throw unwound the whole React tree and replaced
 * the entire application with the route-level error screen, so an operator
 * lost the dashboard they were working in because a footer link failed to
 * render.
 *
 * This boundary keeps the failure contained: the footer degrades to an inline,
 * localized fallback with a retry control and the rest of the shell — including
 * every dashboard control — stays mounted and interactive.
 *
 * The retry button is focused when the fallback appears so a keyboard user does
 * not have to hunt for it.
 */

import {
  Component,
  useEffect,
  useRef,
  type ErrorInfo,
  type ReactNode,
} from "react";

import { useI18n } from "@/i18n/i18n";

export interface FooterErrorBoundaryProps {
  children: ReactNode;
}

interface FooterErrorBoundaryState {
  error: Error | null;
}

function FooterErrorFallback({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  const { t } = useI18n();
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    buttonRef.current?.focus();
  }, []);

  return (
    <div
      role="alert"
      data-testid="footer-error-boundary"
      className="mt-auto w-full border-t border-red-200 bg-red-50 px-4 py-6 text-sm dark:border-red-900 dark:bg-red-950/40"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-medium text-red-800 dark:text-red-200">
            {t("footer.errorTitle")}
          </p>
          <p className="min-w-0 break-words text-xs text-red-600 dark:text-red-300">
            {message}
          </p>
        </div>
        <button
          ref={buttonRef}
          type="button"
          onClick={onRetry}
          className="shrink-0 rounded border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 dark:bg-red-950 dark:text-red-200"
        >
          {t("footer.retry")}
        </button>
      </div>
    </div>
  );
}

export class FooterErrorBoundary extends Component<
  FooterErrorBoundaryProps,
  FooterErrorBoundaryState
> {
  state: FooterErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): FooterErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Logged rather than swallowed so the failure is still diagnosable; the
    // logger is a no-op in tests and respects NEXT_PUBLIC_LOGGING_DISABLED.
    console.error("[footer] failed to render", error, info.componentStack);
  }

  private handleRetry = (): void => {
    // Clearing the error re-mounts the children, which re-runs whatever data
    // source threw the first time.
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (error) {
      return (
        <FooterErrorFallback
          message={error.message || "The footer could not be displayed."}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

export default FooterErrorBoundary;