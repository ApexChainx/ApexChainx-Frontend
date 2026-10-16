"use client";
/** ApexChain Network Operations Intelligence Platform */

import { Fragment } from "react";
import Link from "next/link";

import { useI18n } from "@/i18n/i18n";

/**
 * A single navigation destination. Kept framework-light (plain data + a
 * translation key) so the list can be reused by any navigation surface —
 * the desktop bar today, a mobile drawer/command palette later — without
 * duplicating routes.
 */
export interface NavLinkItem {
  href: string;
  /** i18n key resolved at render time. */
  labelKey: string;
  /** Optional `data-tour` hook used by the onboarding tour. */
  tour?: string;
  /** Only rendered for admin operators. */
  adminOnly?: boolean;
}

export const NAV_LINKS: NavLinkItem[] = [
  { href: "/", labelKey: "common.dashboard", tour: "nav-dashboard" },
  { href: "/outages", labelKey: "common.outages", tour: "nav-outages" },
  { href: "/bulk-import", labelKey: "common.bulkImport" },
  { href: "/payments", labelKey: "common.payments", tour: "nav-payments" },
  { href: "/setting", labelKey: "common.settings" },
  { href: "/payments/retry-queue", labelKey: "common.retryQueue" },
  { href: "/config", labelKey: "common.config", adminOnly: true },
  { href: "/webhooks", labelKey: "common.webhooks", adminOnly: true },
];

/** Filter a link list down to the entries the current operator may see. */
export function visibleNavLinks(
  isAdmin: boolean,
  links: NavLinkItem[] = NAV_LINKS,
): NavLinkItem[] {
  return links.filter((link) => !link.adminOnly || isAdmin);
}

export interface NavLinksProps {
  isAdmin?: boolean;
  links?: NavLinkItem[];
}

/**
 * Reusable navigation link list. When the filtered set is empty it renders an
 * explicit empty state instead of leaving the bar blank (#801).
 */
export function NavLinks({ isAdmin = false, links = NAV_LINKS }: NavLinksProps) {
  const { t } = useI18n();
  const visible = visibleNavLinks(isAdmin, links);

  if (visible.length === 0) {
    return (
      <span
        role="status"
        data-testid="nav-empty-state"
        className="flex items-center gap-2 text-sm italic text-slate-500"
      >
        <span aria-hidden="true">🧭</span>
        {t('navigation.emptyState')}
      </span>
    );
  }

  return (
    <>
      {visible.map((link, index) => (
        <Fragment key={link.href}>
          {index > 0 && <span aria-hidden="true">|</span>}
          <Link
            href={link.href}
            {...(link.tour ? { "data-tour": link.tour } : {})}
          >
            {t(link.labelKey)}
          </Link>
        </Fragment>
      ))}
    </>
  );
}

export default NavLinks;
