"use client";
/** ApexChain Network Operations Intelligence Platform */
/**
 * Site-wide footer.
 *
 * Issues #808 (responsive layout) and #809 (accessibility).
 *
 * #808 — the footer used a fixed four-column flex row, so on a 320px viewport
 * the link columns and the legal line pushed each other past the viewport and
 * forced a horizontal scroll. It now stacks as a single column on narrow
 * screens and only promotes to a multi-column grid from `md` up, with the
 * heading/legal row wrapping instead of overflowing.
 *
 * #809 — the markup is a named `contentinfo` landmark, the link region is a
 * labelled `navigation` landmark so it is distinguishable from the primary
 * nav, the network badge is exposed to assistive tech as an image with a text
 * alternative rather than a bare dot, external links announce that they open in
 * a new tab, and every link carries a visible focus ring (the app-wide link
 * styling suppresses the default outline, so the footer restores its own).
 */

import Link from "next/link";

import { useI18n } from "@/i18n/i18n";
import { useSession } from "@/hooks/useSession";
import { STELLAR_NETWORK } from "@/lib/explorer";
import { visibleFooterGroups, type FooterLink } from "@/components/layout/footer-links";

interface FooterLinkProps {
  link: FooterLink;
}

function FooterLinkItem({ link }: FooterLinkProps) {
  const { t } = useI18n();
  const label = t(link.labelKey);

  // The focus-ring classes live on the anchor itself rather than being inherited
  // from the column, so internal router links and external anchors stay visually
  // identical (#809: the app-wide link styling suppresses the default outline,
  // so the footer restores its own).
  const className =
    "rounded hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400";

  if (link.external) {
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

/** Copyright line — kept separate so the layout row can wrap independently. */
function FooterLegal({ year }: { year: number }) {
  const { t } = useI18n();

  return (
    <p className="min-w-0 text-xs text-slate-500 dark:text-slate-400">
      {t("footer.copyright", { year })}
    </p>
  );
}

export interface FooterProps {
  /** Overrides the current year, so the copyright line stays deterministic in tests. */
  year?: number;
}

export function Footer({ year = new Date().getFullYear() }: FooterProps = {}) {
  const { t } = useI18n();
  const { user } = useSession();
  const isAdmin = user?.role === "admin";
  const groups = visibleFooterGroups(isAdmin);

  return (
    <footer
      // `contentinfo` is the implicit role of a top-level <footer>; naming it
      // lets screen-reader users jump to it directly from a landmark list.
      aria-label={t("footer.landmark")}
      data-testid="site-footer"
      className="mt-auto w-full border-t border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
    >
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          {/* Brand block — stacks above the link columns on narrow viewports. */}
          <div className="flex min-w-0 flex-col gap-2 md:max-w-xs md:shrink">
            <p className="text-base font-semibold text-slate-900 dark:text-slate-50">
              {t("footer.brand")}
            </p>
            <p className="min-w-0 break-words text-xs text-slate-600 dark:text-slate-400">
              {t("footer.tagline")}
            </p>
            <p className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span
                // The dot is decorative; the accessible name below carries the
                // network name so the state is not announced as a bare glyph.
                role="img"
                aria-label={t("footer.network", {
                  network: STELLAR_NETWORK === "mainnet" ? "mainnet" : "testnet",
                })}
                className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
                  STELLAR_NETWORK === "mainnet" ? "bg-amber-500" : "bg-emerald-500"
                }`}
              />
              {t("footer.networkLabel")}
            </p>
          </div>

          {/* Link columns: 1 col → 2 cols → 3 cols. Each column is its own
              landmark so its heading is reachable out of context. */}
          <nav
            aria-label={t("footer.groups.platform")}
            data-testid="footer-links"
            className="grid min-w-0 flex-1 grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {groups.map((group) => (
              <div key={group.id} className="flex min-w-0 flex-col gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-900 dark:text-slate-100">
                  {t(group.titleKey)}
                </h2>
                <ul className="flex min-w-0 flex-col gap-1">
                  {group.links.map((link) => (
                    <li key={link.href} className="min-w-0 break-words">
                      <FooterLinkItem link={link} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
          <FooterLegal year={year} />
          <p className="min-w-0 text-xs text-slate-500 dark:text-slate-400">
            {t("footer.status")}
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;