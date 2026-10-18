"use client";
/** ApexChain Network Operations Intelligence Platform */
/**
 * Application sidebar.
 *
 * Issues #824 (responsive layout), #825 (accessibility), #830 (optimize
 * re-renders) and #831 (keyboard navigation).
 *
 * #824 — the sidebar was a fixed 256px column at every width, so below `lg` it
 * squeezed the page content into an unusable sliver and on a 320px phone it
 * pushed the main region off-screen entirely. It is now a responsive region:
 * a static column from `lg` up, and an off-canvas drawer below that, opened by
 * a toggle and dismissed by overlay, close button, Escape or route change. The
 * drawer body scrolls independently so it can never grow past a short viewport.
 *
 * #825 — the sidebar is a labelled `navigation` landmark, the current route is
 * marked with `aria-current="page"` rather than by colour alone, the toggle is
 * a real `<button>` carrying `aria-expanded`/`aria-controls`, the open drawer is
 * `aria-modal`, and every interactive element has both a visible focus ring and
 * a 44px minimum touch target.
 *
 * #830 — the sidebar sits inside the session provider, so it was re-rendered by
 * every session heartbeat and every React Query invalidation: the whole link
 * tree re-diffed several times a minute for output that almost never changes.
 * The component is therefore split in two:
 *
 *   - `SidebarRoot` owns the state, the effects and the session/route reads. It
 *     renders no translated copy of its own, so a re-render it cannot avoid
 *     costs nothing but a few hook calls.
 *   - `SidebarView` is `memo`'d on primitives and stable identities (the
 *     memoized groups, the collapsed set, the callbacks), so it — and the
 *     memoized `SidebarLinkGroup`s underneath it — only re-renders when
 *     something it actually reads has changed.
 *
 * The groups are computed in a pure function (`groupSidebarLinks`) and
 * memoized on `[isAdmin]` alone — **not** on the session object, which is a
 * fresh reference on every heartbeat.
 *
 * #831 — the sidebar is a long run of links. A keyboard user had to press Tab
 * for every destination to reach the next section. The link list now implements
 * the WAI-ARIA roving-tabindex pattern: one tab stop, arrow keys move between
 * links on both axes and wrap, `Home`/`End` jump to the ends, and `Tab` is never
 * hijacked so focus always leaves. Group headings are real disclosure buttons,
 * so sections can be collapsed and expanded from the keyboard.
 */

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type { KeyboardEvent, RefObject } from "react";

import { usePathname } from "next/navigation";

import { useI18n } from "@/i18n/i18n";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useSession } from "@/hooks/useSession";
import { NAV_LINKS } from "@/components/shell/nav-links";
import { SidebarLinkGroup } from "@/components/layout/SidebarLinkGroup";
import {
  SIDEBAR_LINK_ATTRIBUTE,
  flattenSidebarLinks,
  groupSidebarLinks,
  nextSidebarLinkIndex,
  type SidebarGroupId,
} from "@/components/layout/sidebar-items";

/** Viewport at or above which the sidebar becomes a static column. */
export const DESKTOP_BREAKPOINT_PX = 1024;

function useIsDesktop(): boolean {
  // Starts false so the server render and the first client render agree —
  // rendering a column on one and a drawer on the other is a hydration
  // mismatch. The effect corrects it before the sidebar becomes interactive.
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    // No `matchMedia` (bare DOM, very old browser) means the breakpoint cannot
    // be tracked. Falling back to the static column is the safer default: it
    // never hides navigation behind a control that may not work.
    if (typeof window.matchMedia !== "function") {
      setIsDesktop(true);
      return;
    }

    const query = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT_PX}px)`);
    const sync = () => setIsDesktop(query.matches);

    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return isDesktop;
}

export interface SidebarProps {
  /** Starts the drawer open — for a host that owns its own trigger. */
  defaultOpen?: boolean;
}

function SidebarRoot({ defaultOpen = false }: SidebarProps = {}) {
  const { user } = useSession();
  const pathname = usePathname();
  const isDesktop = useIsDesktop();

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

  // --- #824 — responsive shell -------------------------------------------

  const [isOpen, setIsOpen] = useState(defaultOpen);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const drawerId = useId();

  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((wasOpen) => !wasOpen), []);

  // A route change always closes the drawer: otherwise an operator on a phone
  // taps a link, the page changes behind an opaque panel, and they are left
  // staring at the previous page's navigation.
  //
  // The first run is skipped so `defaultOpen` is honoured — otherwise this
  // effect would close the drawer on mount and make the prop a no-op.
  const hasMounted = useRef(false);
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    setIsOpen(false);
  }, [pathname]);

  // Growing past the breakpoint turns the sidebar into a static column, so any
  // leftover drawer state must not keep it hidden.
  useEffect(() => {
    if (isDesktop) setIsOpen(false);
  }, [isDesktop]);

  // Focus is trapped only while the drawer genuinely covers the page.
  const isTrapActive = !isDesktop && isOpen;
  useFocusTrap(drawerRef, isTrapActive, close, {
    initialFocus: "[data-sidebar-close]",
  });

  // `useFocusTrap` already handles Escape while it is active; this covers the
  // case where the drawer is open but focus has moved back into the page.
  useEffect(() => {
    if (!isOpen || isDesktop) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, isDesktop, close]);

  return (
    <SidebarView
      pathname={pathname}
      isDesktop={isDesktop}
      groups={groups}
      groupOffsets={groupOffsets}
      // The set's identity only changes when a group is actually toggled, so
      // the memoized view is not invalidated on every root re-render.
      collapsedSet={collapsed}
      activeIndex={currentIndex}
      onToggle={handleToggle}
      onActiveLinkChange={handleActiveLinkChange}
      onKeyDown={handleKeyDown}
      listRef={listRef}
      isOpen={isOpen}
      onToggleDrawer={toggle}
      onClose={close}
      drawerId={drawerId}
      drawerRef={drawerRef}
    />
  );
}

interface SidebarViewProps {
  pathname: string | undefined;
  isDesktop: boolean;
  groups: ReturnType<typeof groupSidebarLinks>;
  groupOffsets: number[];
  collapsedSet: ReadonlySet<SidebarGroupId>;
  activeIndex: number;
  onToggle: (groupId: SidebarGroupId) => void;
  onActiveLinkChange: (index: number) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  listRef: RefObject<HTMLElement | null>;
  isOpen: boolean;
  onToggleDrawer: () => void;
  onClose: () => void;
  drawerId: string;
  drawerRef: RefObject<HTMLDivElement | null>;
}

const SidebarView = memo(function SidebarView({
  pathname,
  isDesktop,
  groups,
  groupOffsets,
  collapsedSet,
  activeIndex,
  onToggle,
  onActiveLinkChange,
  onKeyDown,
  listRef,
  isOpen,
  onToggleDrawer,
  onClose,
  drawerId,
  drawerRef,
}: SidebarViewProps) {
  const { t } = useI18n();

  const focusRing =
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400";

  const navContent = (
    <nav
      ref={listRef}
      data-testid="sidebar-nav"
      aria-label={t("navigation.secondary")}
      onKeyDown={onKeyDown}
      className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3"
    >
      {groups.map((group, index) => (
        <SidebarLinkGroup
          key={group.id}
          group={group}
          pathname={pathname}
          isExpanded={!collapsedSet.has(group.id)}
          onToggle={onToggle}
          offset={groupOffsets[index] ?? 0}
          activeIndex={activeIndex}
          onActiveLinkChange={onActiveLinkChange}
        />
      ))}
    </nav>
  );

  const heading = (
    <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
      {t("sidebar.title")}
    </p>
  );

  if (isDesktop) {
    // Static column. Always in the flow from `lg` up, and out of it below so it
    // never squeezes the page content on a narrow viewport.
    return (
      <aside
        data-testid="sidebar"
        data-layout="static"
        className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col dark:border-slate-700 dark:bg-slate-900"
      >
        {heading}
        {navContent}
      </aside>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={onToggleDrawer}
        aria-expanded={isOpen}
        aria-controls={drawerId}
        aria-label={t("sidebar.open")}
        data-testid="sidebar-toggle"
        className={`fixed left-3 top-3 z-40 flex h-11 w-11 items-center justify-center rounded border border-slate-300 bg-white text-slate-700 shadow ${focusRing} dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200`}
      >
        <span aria-hidden="true">{isOpen ? "✕" : "☰"}</span>
      </button>

      {isOpen && (
        <div
          data-testid="sidebar-overlay"
          onClick={onClose}
          // Decorative: the drawer itself already carries `aria-modal`, so
          // exposing the backdrop would just add a second thing to announce.
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-slate-900/50"
        />
      )}

      <div
        ref={drawerRef}
        id={drawerId}
        role="dialog"
        aria-modal={isOpen}
        aria-label={t("sidebar.title")}
        data-testid="sidebar"
        data-state={isOpen ? "open" : "closed"}
        className={[
          "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col",
          "border-r border-slate-200 bg-white shadow-xl",
          "transition-transform duration-200 ease-out motion-reduce:transition-none",
          isOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="flex items-center justify-between px-3 py-3">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            {t("footer.brand")}
          </p>
          <button
            data-sidebar-close
            type="button"
            onClick={onClose}
            aria-label={t("sidebar.close")}
            className={`flex h-11 w-11 items-center justify-center rounded border border-slate-300 text-slate-700 ${focusRing} dark:border-slate-600 dark:text-slate-200`}
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        {heading}
        {navContent}
      </div>
    </>
  );
});

export default SidebarRoot;
