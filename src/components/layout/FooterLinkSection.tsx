"use client";
/** ApexChain Network Operations Intelligence Platform */
/**
 * Link column for the footer (Issues #816, #818, #819).
 *
 * Extracted from the footer monolith so the link list can be rendered by any
 * surface. Two concerns are handled here:
 *
 *   #816 — activating a link emits a `footer.link_click` analytics event
 *   #818 — link colours are declared for both colour schemes
 *
 * Dark-mode colours are explicit rather than inherited, because the app's
 * default link colour (blue) drops below the WCAG AA 4.5:1 contrast ratio on
 * the dark footer surface.
 */

import { memo, useCallback } from "react";

import Link from "next/link";

import { useI18n } from "@/i18n/i18n";
import {
  FOOTER_EVENTS,
  trackFooterEvent,
} from "@/lib/footer-analytics";
import type {
  FooterLink as FooterLinkItem,
  FooterSection,
} from "@/components/layout/footer-sections";

interface FooterLinkProps {
  link: FooterLinkItem;
  sectionId: string;
}

const FooterLink = memo(function FooterLink({
  link,
  sectionId,
}: FooterLinkProps) {
  const { t } = useI18n();
  const label = t(link.labelKey);

  // #816 — one handler per link rather than one per section, so the recorded
  // event names the exact destination instead of just the column.
  const handleActivate = useCallback(() => {
    trackFooterEvent(FOOTER_EVENTS.linkClick, {
      groupId: sectionId,
      href: link.href,
      labelKey: link.labelKey,
      external: link.external === true,
    });
  }, [sectionId, link.href, link.labelKey, link.external]);

  const className =
    // #818 — explicit per-scheme colours; the inherited default fails AA on the
    // dark surface. Underline on hover/focus only, so the column stays quiet.
    "rounded text-slate-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-slate-300 dark:hover:text-slate-100 dark:focus-visible:outline-blue-400";

  if (link.external) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleActivate}
        className={className}
      >
        {label}
        <span className="sr-only"> ({t("footer.opensInNewTab")})</span>
        <span aria-hidden="true">↗</span>
      </a>
    );
  }

  return (
    <Link href={link.href} onClick={handleActivate} className={className}>
      {label}
    </Link>
  );
});

export interface FooterLinkSectionProps {
  section: FooterSection;
}

export const FooterLinkSection = memo(function FooterLinkSection({
  section,
}: FooterLinkSectionProps) {
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
            <FooterLink link={link} sectionId={section.id} />
          </li>
        ))}
      </ul>
    </div>
  );
});

export default FooterLinkSection;