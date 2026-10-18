"use client";
/** ApexChain Network Operations Intelligence Platform */
/**
 * A collapsible sidebar section (Issues #830, #831).
 *
 * Extracted and memoized so that collapsing one group, or moving the roving
 * tabindex onto a link in another group, re-renders only the groups that
 * actually changed (#830).
 *
 * The heading is a real `<button>` with `aria-expanded`/`aria-controls`, so the
 * disclosure is operable by keyboard and announced correctly. When a group is
 * collapsed its links are removed from the tree entirely rather than hidden with
 * CSS — otherwise they would stay reachable by screen reader and keyboard while
 * being invisible, which is worse than either state on its own.
 */

import { memo, useCallback, useId } from "react";

import Link from "next/link";

import { useI18n } from "@/i18n/i18n";
import { usePathname } from "next/navigation";
import { SIDEBAR_LINK_ATTRIBUTE, type SidebarGroup } from "@/components/layout/sidebar-items";

export interface SidebarGroupProps {
  group: SidebarGroup;
  /** Whether the section's links are visible. */
  isExpanded: boolean;
  onToggle: (groupId: SidebarGroup["id"]) => void;
  /** Global offset of this group's first link in the flattened list. */
  offset: number;
  /** Index of the single link currently in the tab order. */
  activeIndex: number;
  /** Mirrors the active link so it can be scrolled into view when focused. */
  onActiveLinkChange: (index: number) => void;
}

export const SidebarLinkGroup = memo(function SidebarGroup({
  group,
  isExpanded,
  onToggle,
  offset,
  activeIndex,
  onActiveLinkChange,
}: SidebarGroupProps) {
  const { t } = useI18n();
  const pathname = usePathname();
  const panelId = useId();

  const handleToggle = useCallback(() => {
    onToggle(group.id);
  }, [group.id, onToggle]);

  const isCurrent = (href: string) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href) === true;

  return (
    <div
      data-testid={`sidebar-group-${group.id}`}
      className="flex min-w-0 flex-col"
    >
      <h2>
        <button
          type="button"
          onClick={handleToggle}
          aria-expanded={isExpanded}
          aria-controls={panelId}
          className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:focus-visible:outline-blue-400"
        >
          <span>{t(group.titleKey)}</span>
          {/* Decorative: `aria-expanded` on the button already conveys state. */}
          <span aria-hidden="true" className="text-xs">
            {isExpanded ? "▾" : "▸"}
          </span>
        </button>
      </h2>

      {isExpanded && (
        <ul id={panelId} className="flex min-w-0 flex-col gap-1">
          {group.links.map((link, index) => {
            const globalIndex = offset + index;
            return (
              <li key={link.href} className="min-w-0">
                <Link
                  href={link.href}
                  {...(link.tour ? { "data-tour": link.tour } : {})}
                  {...(isCurrent(link.href) ? { "aria-current": "page" as const } : {})}
                  {...{ [SIDEBAR_LINK_ATTRIBUTE]: "" }}
                  // Roving tabindex: exactly one link is in the tab order.
                  tabIndex={globalIndex === activeIndex ? 0 : -1}
                  onFocus={() => onActiveLinkChange(globalIndex)}
                  className={[
                    "flex min-h-[44px] items-center rounded px-3 py-2 text-sm",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
                    "dark:focus-visible:outline-blue-400",
                    isCurrent(link.href)
                      ? "bg-slate-100 font-medium text-slate-900 dark:bg-slate-800 dark:text-slate-50"
                      : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60",
                  ].join(" ")}
                >
                  {t(link.labelKey)}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
});

export default SidebarLinkGroup;