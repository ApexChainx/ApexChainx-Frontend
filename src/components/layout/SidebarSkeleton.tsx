"use client";
/** ApexChain Network Operations Intelligence Platform */
/**
 * Sidebar loading skeleton (Issue #826).
 *
 * The sidebar is derived from the session, so on a cold load it rendered
 * nothing at all: the page content settled at full width and then the sidebar
 * appeared and shoved every element across by its own width. On a phone that
 * was a visible jump on every navigation.
 *
 * This skeleton reserves the sidebar's exact box — the static column from `lg`
 * up, the drawer below it — using the shared `Skeleton` primitive, and exposes
 * itself as a polite busy region so assistive tech is told the navigation is
 * still resolving rather than being left to infer it from an empty gap.
 */

import { useI18n } from "@/i18n/i18n";
import { Skeleton } from "@/components/ui/skeleton";
import { DESKTOP_BREAKPOINT_PX } from "@/components/layout/Sidebar";

/** Kept in sync with the destination count the sidebar renders. */
const ROW_COUNT = 6;

export function SidebarSkeleton() {
  const { t } = useI18n();

  return (
    <aside
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-testid="sidebar-skeleton"
      // The same `hidden … lg:flex` contract as the real sidebar, so the
      // placeholder occupies space exactly where the content will land.
      className="hidden w-64 shrink-0 border-r border-slate-200 bg-white p-3 lg:flex lg:flex-col dark:border-slate-700 dark:bg-slate-900"
    >
      <span className="sr-only">{t("sidebar.loading")}</span>

      <Skeleton className="mb-3 h-3 w-24" />

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
        {Array.from({ length: ROW_COUNT }, (_, index) => (
          <Skeleton
            key={index}
            className="h-9 w-full"
            // The live region is declared once on the <aside>; individual bars
            // stay out of the accessibility tree.
            aria-hidden="true"
          />
        ))}
      </div>

      {/* Matches the breakpoint the real sidebar switches layout at, so the
          reserved width is identical above and below it. */}
      <span className="sr-only" data-breakpoint={DESKTOP_BREAKPOINT_PX} />
    </aside>
  );
}

export default SidebarSkeleton;