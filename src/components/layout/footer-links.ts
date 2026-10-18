/** ApexChain Network Operations Intelligence Platform */
/**
 * Single source of truth for the site-wide footer link catalogue.
 *
 * The footer is rendered on every route, so its link list is declared once as
 * plain data (route + i18n key) rather than being inlined into the component.
 * Keeping it as data (rather than JSX) is what lets the footer memoize the
 * rendered link list — the elements can be compared by reference and skipped
 * when nothing that feeds them actually changed.
 *
 * `labelKey` is resolved at render time through `useI18n().t`, so the footer
 * inherits every locale the app ships without a second lookup table here.
 */

/** A single footer destination. */
export interface FooterLink {
  /** Internal route, or an absolute URL when `external` is true. */
  href: string;
  /** i18n key resolved at render time. */
  labelKey: string;
  /** External links open in a new tab and get a noopener rel. */
  external?: boolean;
  /** Rendered only for admin operators. */
  adminOnly?: boolean;
}

/** A titled column of footer links, rendered under its own heading. */
export interface FooterLinkGroup {
  /** Stable id, also used to key the memoized column. */
  id: string;
  /** i18n key for the column heading. */
  titleKey: string;
  links: FooterLink[];
}

/** Marks the elements the footer's roving-tabindex keyboard handler manages. */
export const FOOTER_LINK_ATTRIBUTE = "data-footer-link";

export const FOOTER_LINK_GROUPS: readonly FooterLinkGroup[] = [
  {
    id: "platform",
    titleKey: "footer.groups.platform",
    links: [
      { href: "/", labelKey: "common.dashboard" },
      { href: "/outages", labelKey: "common.outages" },
      { href: "/payments", labelKey: "common.payments" },
      { href: "/payments/retry-queue", labelKey: "common.retryQueue" },
    ],
  },
  {
    id: "operations",
    titleKey: "footer.groups.operations",
    links: [
      { href: "/bulk-import", labelKey: "common.bulkImport" },
      { href: "/setting", labelKey: "common.settings" },
      { href: "/config", labelKey: "common.config", adminOnly: true },
      { href: "/webhooks", labelKey: "common.webhooks", adminOnly: true },
    ],
  },
  {
    id: "resources",
    titleKey: "footer.groups.resources",
    links: [
      {
        href: "https://github.com/ApexChainx/ApexChainx-Frontend",
        labelKey: "footer.links.sourceCode",
        external: true,
      },
      {
        href: "https://stellar.expert",
        labelKey: "footer.links.stellarExplorer",
        external: true,
      },
    ],
  },
];

/**
 * Filter a footer group down to the entries the current operator may see.
 * Mirrors `visibleNavLinks` for the navigation bar so both surfaces agree on
 * what counts as an admin-only destination.
 */
export function visibleFooterLinks(
  links: readonly FooterLink[],
  isAdmin: boolean,
): FooterLink[] {
  return links.filter((link) => !link.adminOnly || isAdmin);
}

/** Groups that still have at least one link after admin filtering. */
export function visibleFooterGroups(
  isAdmin: boolean,
  groups: readonly FooterLinkGroup[] = FOOTER_LINK_GROUPS,
): FooterLinkGroup[] {
  return groups
    .map((group) => ({ ...group, links: visibleFooterLinks(group.links, isAdmin) }))
    .filter((group) => group.links.length > 0);
}

/**
 * Flatten the visible groups into the flat, DOM-order list the roving-tabindex
 * handler walks. Exported so the keyboard logic can be reasoned about (and
 * tested) without rendering anything.
 */
export function flattenFooterLinks(groups: readonly FooterLinkGroup[]): FooterLink[] {
  return groups.flatMap((group) => [...group.links]);
}

/**
 * Resolve the next focused index for a keyboard interaction.
 *
 * Implements the WAI-ARIA roving-tabindex pattern: the arrow keys move between
 * links, `Home`/`End` jump to the ends, and both axes wrap around so a keyboard
 * user never dead-ends at the boundary. `null` means "not handled" — the
 * caller should leave the event alone so native behaviour (Tab, typing in a
 * field) still works.
 */
export function nextFooterLinkIndex(
  currentIndex: number,
  key: string,
  total: number,
): number | null {
  if (total === 0) return null;

  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return (currentIndex + 1) % total;
    case "ArrowLeft":
    case "ArrowUp":
      return (currentIndex - 1 + total) % total;
    case "Home":
      return 0;
    case "End":
      return total - 1;
    default:
      return null;
  }
}