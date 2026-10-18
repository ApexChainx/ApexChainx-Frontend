"use client";
/** ApexChain Network Operations Intelligence Platform */
/**
 * Site-wide footer (Issues #816–#819).
 *
 * The footer is now a *composition* of reusable pieces rather than a monolith.
 * Everything it renders — the brand block, each link column, the empty state,
 * the legal row — is a separate exported component taking plain props, so an
 * about page, an error screen or an embed can borrow any of them without
 * copying markup. This component is the default wiring of those pieces for the
 * site shell, not the only place they can be used.
 *
 * #816 — footer interactions are recorded as analytics events
 * #817 — a footer with nothing to show renders a designed empty state
 * #818 — colours are declared for both colour schemes
 * #819 — the footer is extracted into reusable, prop-driven components
 */

import { memo, useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";

import { useI18n } from "@/i18n/i18n";
import { useSession } from "@/hooks/useSession";
import { STELLAR_NETWORK } from "@/lib/explorer";
import { FOOTER_EVENTS, trackFooterEvent } from "@/lib/footer-analytics";
import { FooterBrand } from "@/components/layout/FooterBrand";
import FooterEmptyState from "@/components/layout/FooterEmptyState";
import { FooterLinkSection } from "@/components/layout/FooterLinkSection";
import {
  FOOTER_SECTIONS,
  visibleFooterSections,
  type FooterSection,
} from "@/components/layout/footer-sections";

export interface FooterProps {
  /** Overrides the current year so the copyright line is deterministic in tests. */
  year?: number;
  /** Catalogue to render. Defaults to the site-wide sections. */
  sections?: readonly FooterSection[];
  /** Replaces the default empty state (#817). */
  emptyState?: ReactNode;
  /** Set false to suppress analytics (#816), e.g. in an embed or a test. */
  trackEvents?: boolean;
}

function Footer({
  year = new Date().getFullYear(),
  sections = FOOTER_SECTIONS,
  emptyState,
  trackEvents = true,
}: FooterProps = {}) {
  const { t } = useI18n();
  const { user } = useSession();
  const isAdmin = user?.role === "admin";
  const hasTrackedView = useRef(false);

  // Keyed on `isAdmin` alone: `useSession` returns a fresh object on every
  // heartbeat, so depending on it would recompute the catalogue for an
  // identical result several times a minute.
  const visibleSections = useMemo(
    () => visibleFooterSections(isAdmin, sections),
    [isAdmin, sections],
  );

  const linkCount = useMemo(
    () => visibleSections.reduce((total, section) => total + section.links.length, 0),
    [visibleSections],
  );

  // #816 — one `footer.view` per mount, not one per render. Without the ref
  // guard the effect would re-fire on every session heartbeat.
  useEffect(() => {
    if (!trackEvents || hasTrackedView.current) return;
    hasTrackedView.current = true;
    trackFooterEvent(FOOTER_EVENTS.view, { linkCount });
  }, [trackEvents, linkCount]);

  // #817 — an empty catalogue is an explicit, designed state, not a blank box.
  useEffect(() => {
    if (!trackEvents || linkCount > 0) return;
    trackFooterEvent(FOOTER_EVENTS.empty, { linkCount });
  }, [trackEvents, linkCount]);

  const network = STELLAR_NETWORK === "mainnet" ? "mainnet" : "testnet";
  const brand = useMemo(
    () => ({ nameKey: "footer.brand", taglineKey: "footer.tagline" }),
    [],
  );

  return (
    <footer
      aria-label={t("footer.landmark")}
      data-testid="site-footer"
      data-theme="responsive"
      // #818 — the surface itself carries an explicit dark scheme rather than
      // relying on inherited tokens, so the footer stays legible whichever
      // surface it is embedded in.
      className="mt-auto w-full border-t border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
    >
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <FooterBrand brand={brand} network={network} />

          {linkCount === 0 ? (
            <div className="min-w-0 flex-1">
              {emptyState ?? <FooterEmptyState />}
            </div>
          ) : (
            <nav
              aria-label={t("footer.groups.platform")}
              data-testid="footer-links"
              className="grid min-w-0 flex-1 grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              {visibleSections.map((section) => (
                <FooterLinkSection key={section.id} section={section} />
              ))}
            </nav>
          )}
        </div>

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

/*
 * Reusable pieces (#819). Import them directly:
 *
 *   import { FooterBrand } from "@/components/layout/FooterBrand";
 *   import { FooterLinkSection } from "@/components/layout/FooterLinkSection";
 *   import { FooterEmptyState } from "@/components/layout/FooterEmptyState";
 *   import { visibleFooterSections } from "@/components/layout/footer-sections";
 *
 * They are re-exported here as a convenience for consumers that already import
 * the footer; a `footer/` barrel directory is deliberately avoided so the
 * module specifier can never collide with `Footer.tsx` on a case-insensitive
 * filesystem.
 */
export { FooterBrand } from "@/components/layout/FooterBrand";
export { FooterLinkSection } from "@/components/layout/FooterLinkSection";
export { FooterEmptyState } from "@/components/layout/FooterEmptyState";
export { visibleFooterSections } from "@/components/layout/footer-sections";