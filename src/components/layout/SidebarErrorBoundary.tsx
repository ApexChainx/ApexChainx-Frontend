"use client";
/** ApexChain Network Operations Intelligence Platform */
/**
 * Sidebar error boundary (Issue #827).
 *
 * The sidebar is composed from session state (`useSession`), the route
 * (`usePathname`) and the translated link catalogue. Any of those can throw
 * while still resolving — a session snapshot that fails to parse, a message
 * bundle that could not be loaded.
 *
 * Without a boundary such a throw unwound the whole React tree and replaced the
 * entire application with the route-level error screen, so an operator lost the
 * dashboard they were working in because a *navigation* link failed to render.
 * Navigation is the least valuable thing on the page and must never be able to
 * take the page down with it.
 *
 * This boundary contains the failure: the sidebar collapses to a compact,
 * localized placeholder that keeps its width — so the page content does not
 * shift — and the rest of the shell stays mounted and interactive. The retry
 * button is focused on mount so a keyboard user lands on the recovery control.
 */

import {
  Component,
  useEffect,
  useRef,
  type ErrorInfo,
  type ReactNode,
} from "react";

import { useI18n } from "@/i18n/i18n";

export interface SidebarErrorBoundaryProps {
  children: ReactNode;
}

interface SidebarErrorBoundaryState {
  error: Error | null;
}

function SidebarErrorFallback({
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
    // Keeps the sidebar's reserved width so the page does not shift when the
    // real navigation takes over after a successful retry.
    <aside
      role="alert"
      data-testid="sidebar-error-boundary"
      data-layout="static"
      className="hidden w-64 shrink-0 border-r border-red-200 bg-red-50 p-3 lg:flex lg:flex-col dark:border-red-900 dark:bg-red-950/40"
    >
      <p className="text-sm font-medium text-red-800 dark:text-red-200">
        {t("sidebar.errorTitle")}
      </p>
      <p className="mt-1 min-w-0 break-words text-xs text-red-600 dark:text-red-300">
        {message}
      </p>
      <button
        ref={buttonRef}
        type="button"
        onClick={onRetry}
        className="mt-3 flex min-h-[44px] w-full items-center justify-center rounded border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 dark:bg-red-950 dark:text-red-200"
      >
        {t("common.retry")}
      </button>
    </aside>
  );
}

export class SidebarErrorBoundary extends Component<
  SidebarErrorBoundaryProps,
  SidebarErrorBoundaryState
> {
  state: SidebarErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): SidebarErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Logged rather than swallowed, so the failure stays diagnosable. The
    // page shell is untouched, so this console entry is the only trace.
    console.error("[sidebar] failed to render", error, info.componentStack);
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
        <SidebarErrorFallback
          message={error.message || "The navigation could not be displayed."}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

export default SidebarErrorBoundary;