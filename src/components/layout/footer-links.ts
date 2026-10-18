/** ApexChain Network Operations Intelligence Platform */
/**
 * Single source of truth for the site-wide footer link catalogue.
 *
 * The footer is rendered on every route, so its link list is declared once as
 * plain data (route + i18n key) instead of being inlined into the component.
 * That keeps the presentational component free of copy decisions and lets any
 * other surface (an about page, a command palette, the docs) reuse the exact
 * same destinations without drifting.
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

/** A titled column of footer links, rendered as its own labelled `<nav>`. */
export interface FooterLinkGroup {
  /** Stable id used for the column's heading anchor. */
  id: string;
  /** i18n key for the column heading. */
  titleKey: string;
  links: FooterLink[];
}

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
    .map((group) => ({
      ...group,
      links: visibleFooterLinks(group.links, isAdmin),
    }))
    .filter((group) => group.links.length > 0);
}