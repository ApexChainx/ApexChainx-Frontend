"use client";
/** ApexChain Network Operations Intelligence Platform */
/**
 * Footer loading skeleton (Issue #810).
 *
 * The footer is rendered inside the authenticated shell, so on a cold load it
 * appeared after a visible pop-in: the page content settled, then the footer
 * snapped into place and pushed the scroll position. This skeleton reserves
 * the footer's box before the real content resolves so the layout does not
 * shift.
 *
 * It mirrors `Footer`'s structure (brand block, three link columns, legal row)
 * using the shared `Skeleton` primitive, and is exposed as a polite live region
 * so assistive tech announces that the region is still loading rather than
 * silently reserving space.
 */

import { useI18n } from "@/i18n/i18n";
import { Skeleton } from "@/components/ui/skeleton";

/** Column count kept in sync with `Footer`'s `lg:grid-cols-3` layout. */
const COLUMN_COUNT = 3;
const LINKS_PER_COLUMN = 3;

export function FooterSkeleton() {
  const { t } = useI18n();

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-testid="footer-skeleton"
      className="mt-auto w-full border-t border-slate-200 bg-slate-50 px-4 py-8 dark:border-slate-700 dark:bg-slate-900"
    >
      <span className="sr-only">{t("footer.loading")}</span>

      <div className="mx-auto w-full max-w-7xl">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 flex-col gap-2 md:max-w-xs md:shrink">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-16" />
          </div>

          <div className="grid min-w-0 flex-1 grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: COLUMN_COUNT }, (_, column) => (
              <div key={column} className="flex min-w-0 flex-col gap-2">
                <Skeleton className="h-3 w-24" />
                {Array.from({ length: LINKS_PER_COLUMN }, (_, link) => (
                  <Skeleton key={link} className="h-3 w-32" />
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </div>
  );
}

export default FooterSkeleton;