"use client";
/** ApexChain Network Operations Intelligence Platform */
/**
 * Application sidebar.
 *
 * Issues #830 (optimize re-renders) and #831 (keyboard navigation).
 *
 * #830 — the sidebar sits inside the session provider, so it was re-rendered by
 * every session heartbeat and every React Query invalidation: the whole link
 * tree re-diffed several times a minute for output that almost never changes.
 * Three changes fix it:
 *
 *   1. The link groups are computed in a pure function (`groupSidebarLinks`)
 *      and memoized on `[isAdmin]` alone — **not** on the session object, which
 *      is a fresh reference on every heartbeat.
 *   2. `SidebarLinkGroup` is memoized on its own props, so collapsing one group
 *      or moving the roving tabindex onto a link in another re-renders only the
 *      group that changed.
 *   3. The exported default is `memo`, so an unrelated parent render never
 *      cascades in.
 *
 * #831 — the sidebar is a long run of links. A keyboard user had to press Tab
 * for every destination to reach the next section. The link list now implements
 * the WAI-ARIA roving-tabindex pattern: one tab stop, arrow keys move between
 * links on both axes and wrap, `Home`/`End` jump to the ends, and `Tab` is never
 * hijacked so focus always leaves. Group headings are real disclosure buttons,
 * so sections can be collapsed and expanded from the keyboard.
 */

import { memo, useCallback, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

import { useI18n } from "@/i18n/i18n";
import { useSession } from "@/hooks/useSession";
import { NAV_LINKS } from "@/components/shell/nav-links";
import { SidebarLinkGroup } from "@/components/layout/SidebarLinkGroup";
import {
  SIDEBAR_LINK_ATTRIBUTE,
  flattenSidebarLinks,
  groupSidebarLinks,
  nextSidebarLinkIndex,
  type SidebarGroup,
  type SidebarGroupId,
} from "@/components/layout/sidebar-items";

/** Groups start expanded; an operator should not have to opt in to navigation. */
const DEFAULT_EXPANDED: ReadonlySet<SidebarGroupId> = new Set<SidebarGroupId>([
  "operations",
  "administration",
]);

function Sidebar() {
  const { t } = useI18n();
  const { user } = useSession();
  const isAdmin = user?.role === "admin";

  // #830 — keyed on `isAdmin` alone. `useSession` returns a fresh object on
  // every heartbeat, so depending on it would regroup the whole tree several
  // times a minute for an identical result.
  const groups = useMemo(() => groupSidebarLinks(isAdmin, NAV_LINKS), [isAdmin]);

  const [collapsed, setCollapsed] = useState<ReadonlySet<SidebarGroupId>>(
    () => new Set<SidebarGroupId>(),
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLElement | null>(null);

  // Only expanded groups are reachable, so the flattened list — and therefore
  // every index into it — is computed from what is actually on screen.
  const visibleGroups = useMemo(
    () => groups.filter((group) => !collapsed.has(group.id)),
    [groups, collapsed],
  );
  const links = useMemo(() => flattenSidebarLinks(visibleGroups), [visibleGroups]);

  // Offsets let a group number its own links without re-flattening the list.
  const groupOffsets = useMemo(() => {
    const offsets: number[] = [];
    let running = 0;
    for (const group of visibleGroups) {
      offsets.push(running);
      running += group.links.length;
    }
    return offsets;
  }, [visibleGroups]);

  // Collapsing can remove links out from under the active index; clamp it back
  // into range so there is always exactly one valid tab stop.
  const currentIndex = activeIndex < links.length ? activeIndex : 0;

  // #831 — a single delegated handler covers the whole list, so the listener
  // count does not grow with the destination count.
  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLElement>) => {
    const list = listRef.current;
    if (!list) return;

    const items = Array.from(
      list.querySelectorAll<HTMLAnchorElement>(`[${SIDEBAR_LINK_ATTRIBUTE}]`),
    );
    if (items.length === 0) return;

    const focusedIndex = items.indexOf(document.activeElement as HTMLAnchorElement);
    // Only hijack the arrows when focus is inside the list; from anywhere else
    // the browser keeps its normal behaviour.
    if (focusedIndex === -1) return;

    const target = nextSidebarLinkIndex(focusedIndex, event.key, items.length);
    if (target === null) return;

    event.preventDefault();
    setActiveIndex(target);
    items[target]?.focus();
  }, []);

  // Stable identities, so the memoized groups are not invalidated by a fresh
  // callback on every render.
  const handleToggle = useCallback((groupId: SidebarGroupId) => {
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  const handleActiveLinkChange = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  return (
    <aside
      data-testid="sidebar"
      className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
    >
      <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {t("sidebar.title")}
      </p>

      <nav
        ref={listRef}
        aria-label={t("navigation.secondary")}
        onKeyDown={handleKeyDown}
        className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3"
      >
        {groups.map((group, index) => (
          <SidebarLinkGroup
            key={group.id}
            group={group}
            isExpanded={!collapsed.has(group.id)}
            onToggle={handleToggle}
            offset={groupOffsets[index] ?? 0}
            activeIndex={currentIndex}
            onActiveLinkChange={handleActiveLinkChange}
          />
        ))}
      </nav>
    </aside>
  );
}

// #830 — memoized so an unrelated parent re-render (session heartbeat, query
// invalidation, toast) does not cascade into the sidebar subtree.
export default memo(Sidebar);

export { Sidebar };