"use client";
/** ApexChain Network Operations Intelligence Platform */
/**
 * Empty state for the footer (Issue #817).
 *
 * When every link is filtered out — a non-admin operator on a deployment with
 * no public destinations, or an embed rendered without a catalogue — the
 * footer used to render a bare heading with nothing under it, or worse, an
 * empty bordered box the height of a full column. Both read as a rendering
 * bug rather than as "there is nothing here yet".
 *
 * This renders an explicit, designed empty state instead: a polite status
 * region that says what is missing and points at the place where it gets
 * configured. It is exported so any surface that composes the footer pieces
 * can use the same treatment.
 */

import { useI18n } from "@/i18n/i18n";

export interface FooterEmptyStateProps {
  /** Overrides the default explanatory message. */
  message?: string;
}

export function FooterEmptyState({ message }: FooterEmptyStateProps = {}) {
  const { t } = useI18n();

  return (
    <div
      role="status"
      data-testid="footer-empty-state"
      className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white/60 px-6 py-8 text-center dark:border-slate-700 dark:bg-slate-800/40"
    >
      <span aria-hidden="true" className="text-2xl">
        🧭
      </span>
      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
        {message ?? t("footer.empty.title")}
      </p>
      <p className="max-w-sm text-xs text-slate-600 dark:text-slate-400">
        {t("footer.empty.hint")}
      </p>
    </div>
  );
}

export default FooterEmptyState;