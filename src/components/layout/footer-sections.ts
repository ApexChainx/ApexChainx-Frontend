/** ApexChain Network Operations Intelligence Platform */
/**
 * Footer section catalogue (Issues #816–#819).
 *
 * The footer was previously a single monolith: the brand block, the link
 * columns, the legal line and the analytics wiring were all inlined into one
 * component. Nothing could be reused from it — an about page, an error screen
 * or an embed could not borrow the link columns without copying the markup, and
 * the copy diverged on every reuse.
 *
 * This module is the extraction point. Everything the footer renders is now
 * plain data with an explicit type, so the presentational components take
 * props and know nothing about routes, sessions or copy decisions. The footer
 * becomes the default composition of those pieces rather than the only place
 * they can exist.
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

/** A titled column of footer links. */
export interface FooterSection {
  /** Stable id; also used as the analytics `groupId`. */
  id: string;
  /** i18n key for the column heading. */
  titleKey: string;
  links: FooterLink[];
}

/** Brand copy shown in the footer's first column. */
export interface FooterBrand {
  /** i18n key for the product name. */
  nameKey: string;
  /** i18n key for the one-line description. */
  taglineKey: string;
}

/** The default catalogue the site-wide footer renders. */
export const FOOTER_SECTIONS: readonly FooterSection[] = [
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

/** Filter a section down to the entries the current operator may see. */
export function visibleFooterLinks(
  links: readonly FooterLink[],
  isAdmin: boolean,
): FooterLink[] {
  return links.filter((link) => !link.adminOnly || isAdmin);
}

/**
 * Sections that still have at least one link after admin filtering.
 *
 * A section left empty is dropped rather than rendered as a bare heading — a
 * column with a title and nothing under it reads as a rendering bug to an
 * operator, and it is what the empty state (#817) is for.
 */
export function visibleFooterSections(
  isAdmin: boolean,
  sections: readonly FooterSection[] = FOOTER_SECTIONS,
): FooterSection[] {
  return sections
    .map((section) => ({
      ...section,
      links: visibleFooterLinks(section.links, isAdmin),
    }))
    .filter((section) => section.links.length > 0);
}