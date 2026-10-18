"use client";
/** ApexChain Network Operations Intelligence Platform */
/**
 * Site-wide footer.
 *
 * Issues #820 (TypeScript strict typing), #821 (i18n translations), #822 (form
 * validation) and #823 (memoize expensive computations).
 */

import { memo, useCallback, useMemo } from "react";
import type { ReactNode } from "react";

import Link from "next/link";

import { useI18n } from "@/i18n/i18n";
import { useSession } from "@/hooks/useSession";
import { STELLAR_NETWORK } from "@/lib/explorer";
import {
  buildFooterSummary,
} from "@/components/layout/footer-derive";
import FooterSubscribeForm from "@/components/layout/FooterSubscribeForm";
import type {
  FooterDestination,
  FooterSection,
  StellarNetworkName,
  ValidatedEmail,
} from "@/components/layout/footer-types";

/** The default site-wide catalogue. */
export const FOOTER_SECTIONS: readonly FooterSection[] = [
  {
    id: "platform",
    titleKey: "footer.groups.platform",
    links: [
      { kind: "internal", href: "/", labelKey: "common.dashboard" },
      { kind: "internal", href: "/outages", labelKey: "common.outages" },
      { kind: "internal", href: "/payments", labelKey: "common.payments" },
      {
        kind: "internal",
        href: "/payments/retry-queue",
        labelKey: "common.retryQueue",
      },
    ],
  },
  {
    id: "operations",
    titleKey: "footer.groups.operations",
    links: [
      { kind: "internal", href: "/bulk-import", labelKey: "common.bulkImport" },
      { kind: "internal", href: "/setting", labelKey: "common.settings" },
      { kind: "internal", href: "/config", labelKey: "common.config", adminOnly: true },
      { kind: "internal", href: "/webhooks", labelKey: "common.webhooks", adminOnly: true },
    ],
  },
  {
    id: "resources",
    titleKey: "footer.groups.resources",
    links: [
      {
        kind: "external",
        href: "https://github.com/ApexChainx/ApexChainx-Frontend",
        labelKey: "footer.links.sourceCode",
        external: true,
      },
      {
        kind: "external",
        href: "https://stellar.expert",
        labelKey: "footer.links.stellarExplorer",
        external: true,
      },
    ],
  },
];

interface FooterLinkProps {
  link: FooterDestination;
}

function FooterLinkItem({ link }: FooterLinkProps) {
  const { t } = useI18n();
  const label = t(link.labelKey);

  const className =
    "rounded text-slate-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-slate-300 dark:focus-visible:outline-blue-400";

  // The discriminated union makes this branch total: an internal destination is
  // a route, an external one is an absolute URL that must carry `noopener`.
  if (link.kind === "external") {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {label}
        <span className="sr-only"> ({t("footer.opensInNewTab")})</span>
        <span aria-hidden="true">↗</span>
      </a>
    );
  }

  return (
    <Link href={link.href} className={className}>
      {label}
    </Link>
  );
}

interface FooterSectionColumnProps {
  section: FooterSection;
}

function FooterSectionColumn({ section }: FooterSectionColumnProps) {
  const { t } = useI18n();

  return (
    <div
      data-testid={`footer-section-${section.id}`}
      className="flex min-w-0 flex-col gap-2"
    >
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-900 dark:text-slate-100">
        {t(section.titleKey)}
      </h2>
      <ul className="flex min-w-0 flex-col gap-1">
        {section.links.map((link) => (
          <li key={link.href} className="min-w-0 break-words">
            <FooterLinkItem link={link} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface FooterProps {
  /** Overrides the current year so the copyright line is deterministic in tests. */
  year?: number;
  /** Catalogue to render. Defaults to the site-wide sections. */
  sections?: readonly FooterSection[];
  /** Hides the status-updates form (#822). */
  hideSubscribe?: boolean;
  /** Persists a status-updates subscription (#822). */
  onSubscribe?: (email: ValidatedEmail) => Promise<void>;
  /** Replaces the form entirely, e.g. with an opt-out notice. */
  subscribeSlot?: ReactNode;
}

function Footer({
  year = new Date().getFullYear(),
  sections = FOOTER_SECTIONS,
  hideSubscribe = false,
  onSubscribe,
  subscribeSlot,
}: FooterProps = {}) {
  const { t } = useI18n();
  const { user } = useSession();
  const isAdmin = user?.role === "admin";

  // #823 — one memoized pass produces the filtered catalogue, the counts and
  // each column's offset. Keyed on `isAdmin` and `sections` alone: `useSession`
  // returns a fresh object on every heartbeat, so depending on it would redo all
  // of this for an identical result.
  const summary = useMemo(
    () => buildFooterSummary(sections, isAdmin),
    [isAdmin, sections],
  );

  const network: StellarNetworkName = STELLAR_NETWORK === "mainnet" ? "mainnet" : "testnet";

  // Placeholder sink: the endpoint is wired up in a follow-up. Kept stable so
  // the form's submit handler does not change identity every render.
  const handleSubscribe = useCallback(async (_email: ValidatedEmail) => {}, []);

  return (
    <footer
      aria-label={t("footer.landmark")}
      data-testid="site-footer"
      className="mt-auto w-full border-t border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
    >
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div
            data-testid="footer-brand"
            className="flex min-w-0 flex-col gap-2 md:max-w-xs md:shrink"
          >
            <p className="text-base font-semibold text-slate-900 dark:text-slate-50">
              {t("footer.brand")}
            </p>
            <p className="min-w-0 break-words text-xs text-slate-600 dark:text-slate-400">
              {t("footer.tagline")}
            </p>
            <p className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span
                role="img"
                aria-label={t("footer.network", { network })}
                className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
                  network === "mainnet"
                    ? "bg-amber-500 dark:bg-amber-400"
                    : "bg-emerald-600 dark:bg-emerald-400"
                }`}
              />
              {t("footer.networkLabel")}
            </p>
          </div>

          <nav
            aria-label={t("footer.groups.platform")}
            data-testid="footer-links"
            data-link-count={summary.totalLinks}
            className="grid min-w-0 flex-1 grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {summary.sections.map((section) => (
              <FooterSectionColumn key={section.id} section={section} />
            ))}
          </nav>
        </div>

        {!hideSubscribe && (
          <div className="mt-8 border-t border-slate-200 pt-4 dark:border-slate-700">
            {subscribeSlot ?? (
              <FooterSubscribeForm onSubscribe={onSubscribe ?? handleSubscribe} />
            )}
          </div>
        )}

        <div className="mt-8 flex flex-col gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
          <p className="min-w-0 text-xs text-slate-500 dark:text-slate-400">
            {t("footer.copyright", { year })}
          </p>
          <p className="min-w-0 text-xs text-slate-500 dark:text-slate-400">
            {t("footer.status")}
          </p>
        </div>
      </div>
    </footer>
  );
}

export default memo(Footer);

export { Footer };
export type { FooterSection, FooterDestination, ValidatedEmail };