"use client";
/** ApexChain Network Operations Intelligence Platform */
/**
 * Site-wide footer.
 *
 * Issues #812 (unit tests), #813 (integration tests), #814 (optimize
 * re-renders) and #815 (keyboard navigation).
 *
 * #814 — the footer sits outside `<main>` but inside the session and i18n
 * providers, so it re-rendered on every session heartbeat, every React Query
 * invalidation and every toast in the app: ~40 elements re-diffed several times
 * a minute for output that almost never changes. Three things fix it:
 *
 *   1. `memo` on the three presentational pieces, so a prop-identical render
 *      is skipped outright rather than re-diffed.
 *   2. The link catalogue is module-level data and the admin-filtered view of
 *      it is `useMemo`'d on `[isAdmin]` alone — not on the whole session
 *      object, which is a fresh reference on every heartbeat.
 *   3. `React.memo` on the exported default, so a parent re-render that does
 *      not change `year` does not cascade into the subtree at all.
 *
 * #815 — the footer is a long run of links (12+ on a desktop layout). A keyboard
 * user had to press Tab for every one of them to reach the next section. The
 * link region now implements the WAI-ARIA roving-tabindex pattern: the whole
 * group is a single tab stop, and the arrow keys move between links, `Home`/`End`
 * jump to the ends, and both axes wrap. Plain Tab still leaves the footer
 * normally, so it never traps focus.
 */

import { memo, useCallback, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

import Link from "next/link";

import { useI18n } from "@/i18n/i18n";
import { useSession } from "@/hooks/useSession";
import { STELLAR_NETWORK } from "@/lib/explorer";
import {
  FOOTER_LINK_ATTRIBUTE,
  flattenFooterLinks,
  nextFooterLinkIndex,
  visibleFooterGroups,
  type FooterLink,
  type FooterLinkGroup,
} from "@/components/layout/footer-links";

interface FooterLinkItemProps {
  link: FooterLink;
  /**
   * Position in the flattened, DOM-order link list. Only one link is in the tab
   * order at a time (roving tabindex); the arrow keys move between them.
   */
  index: number;
  /** Index of the single link that is currently tabbable. */
  activeIndex: number;
}

/**
 * Memoized so moving the roving-tabindex focus from one link to the next
 * re-renders exactly the two links involved (#814) instead of every link in
 * every column.
 */
const FooterLinkItem = memo(function FooterLinkItem({
  link,
  index,
  activeIndex,
}: FooterLinkItemProps) {
  const { t } = useI18n();
  const label = t(link.labelKey);
  const tabIndex = index === activeIndex ? 0 : -1;

  const className =
    "rounded hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400";

  if (link.external) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        data-footer-link=""
        tabIndex={tabIndex}
        className={className}
      >
        {label}
        <span className="sr-only"> ({t("footer.opensInNewTab")})</span>
        <span aria-hidden="true">↗</span>
      </a>
    );
  }

  return (
    <Link href={link.href} data-footer-link="" tabIndex={tabIndex} className={className}>
      {label}
    </Link>
  );
});

interface FooterLinkColumnProps {
  group: FooterLinkGroup;
  activeIndex: number;
  /** Global offset of this column's first link in the flattened list. */
  offset: number;
}

const FooterLinkColumn = memo(function FooterLinkColumn({
  group,
  activeIndex,
  offset,
}: FooterLinkColumnProps) {
  const { t } = useI18n();

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-900 dark:text-slate-100">
        {t(group.titleKey)}
      </h2>
      <ul className="flex min-w-0 flex-col gap-1">
        {group.links.map((link, linkIndex) => (
          <li key={link.href} className="min-w-0 break-words">
            <FooterLinkItem
              link={link}
              index={offset + linkIndex}
              activeIndex={activeIndex}
            />
          </li>
        ))}
      </ul>
    </div>
  );
});

interface FooterBrandProps {
  networkLabel: string;
}

const FooterBrand = memo(function FooterBrand({ networkLabel }: FooterBrandProps) {
  const { t } = useI18n();

  return (
    <div className="flex min-w-0 flex-col gap-2 md:max-w-xs md:shrink">
      <p className="text-base font-semibold text-slate-900 dark:text-slate-50">
        {t("footer.brand")}
      </p>
      <p className="min-w-0 break-words text-xs text-slate-600 dark:text-slate-400">
        {t("footer.tagline")}
      </p>
      <p className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span
          // The dot is decorative; the accessible name carries the network so
          // the state is announced instead of skipped as a bare glyph.
          role="img"
          aria-label={t("footer.network", { network: networkLabel })}
          className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
            networkLabel === "mainnet" ? "bg-amber-500" : "bg-emerald-500"
          }`}
        />
        {t("footer.networkLabel")}
      </p>
    </div>
  );
});

export interface FooterProps {
  /** Overrides the current year so the copyright line is deterministic in tests. */
  year?: number;
}

function Footer({ year = new Date().getFullYear() }: FooterProps = {}) {
  const { t } = useI18n();
  const { user } = useSession();
  const isAdmin = user?.role === "admin";

  // Roving tabindex: the index of the single link in the tab order. Arrow keys
  // move it; it resets to the first link when the visible link set changes.
  const [activeIndex, setActiveIndex] = useState(0);
  const linkRegionRef = useRef<HTMLElement | null>(null);

  // #814 — keyed on `isAdmin`, not on the session object. `useSession` returns
  // a fresh object on every heartbeat, so depending on it would recompute the
  // catalogue several times a minute for an identical result.
  const groups = useMemo(() => visibleFooterGroups(isAdmin), [isAdmin]);
  const flatLinks = useMemo(() => flattenFooterLinks(groups), [groups]);

  // The active index can outlive the link set (e.g. the operator loses admin
  // and the last column disappears); clamp it back into range.
  const currentIndex = activeIndex < flatLinks.length ? activeIndex : 0;

  // #815 — roving tabindex. One keydown handler for the whole link region
  // instead of one per link, so the listener count does not grow with the
  // catalogue.
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      const region = linkRegionRef.current;
      if (!region) return;

      const links = Array.from(
        region.querySelectorAll<HTMLAnchorElement>(`[${FOOTER_LINK_ATTRIBUTE}]`),
      );
      if (links.length === 0) return;

      const focusedIndex = links.indexOf(document.activeElement as HTMLAnchorElement);
      // Only hijack the arrow keys when focus is actually inside the region;
      // otherwise let the browser handle them normally.
      if (focusedIndex === -1) return;

      const target = nextFooterLinkIndex(focusedIndex, event.key, links.length);
      if (target === null) return;

      event.preventDefault();
      setActiveIndex(target);
      links[target]?.focus();
    },
    [],
  );

  // Offsets let each column render its links without re-flattening the list.
  const columnOffsets = useMemo(() => {
    const offsets: number[] = [];
    let running = 0;
    for (const group of groups) {
      offsets.push(running);
      running += group.links.length;
    }
    return offsets;
  }, [groups]);

  const networkLabel = STELLAR_NETWORK === "mainnet" ? "mainnet" : "testnet";

  return (
    <footer
      aria-label={t("footer.landmark")}
      data-testid="site-footer"
      className="mt-auto w-full border-t border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
    >
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <FooterBrand networkLabel={networkLabel} />

          <nav
            ref={linkRegionRef}
            aria-label={t("footer.groups.platform")}
            data-testid="footer-links"
            onKeyDown={handleKeyDown}
            className="grid min-w-0 flex-1 grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {groups.map((group, columnIndex) => (
              <FooterLinkColumn
                key={group.id}
                group={group}
                activeIndex={currentIndex}
                offset={columnOffsets[columnIndex] ?? 0}
              />
            ))}
          </nav>
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

// #814 — memoized so an unrelated parent re-render (session heartbeat, query
// invalidation, toast) does not cascade into the footer subtree.
export default memo(Footer);

export { Footer };