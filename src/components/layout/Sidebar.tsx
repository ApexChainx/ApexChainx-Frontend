"use client";
/** ApexChain Network Operations Intelligence Platform */
/**
 * Application sidebar.
 *
 * Issues #824 (responsive layout) and #825 (accessibility).
 *
 * #824 — the sidebar was a fixed 256px column at every width, so below `lg` it
 * squeezed the page content into an unusable sliver and on a 320px phone it
 * pushed the main region off-screen entirely. It is now a responsive region:
 * a static column from `lg` up, and an off-canvas drawer below that, opened by
 * a toggle and dismissed by overlay, close button, Escape or route change. The
 * drawer body scrolls independently so it can never grow past a short viewport.
 *
 * #825 — the sidebar is a labelled `navigation` landmark, the current route is
 * marked with `aria-current="page"` rather than by colour alone, the toggle is a
 * real `<button>` carrying `aria-expanded`/`aria-controls`, the open drawer is
 * `aria-modal`, and every interactive element has both a visible focus ring and
 * a 44px minimum touch target.
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useI18n } from "@/i18n/i18n";
import { useSession } from "@/hooks/useSession";
import { visibleNavLinks } from "@/components/shell/nav-links";

/** Viewport at or above which the sidebar becomes a static column. */
export const DESKTOP_BREAKPOINT_PX = 1024;

/** How many destinations the bottom tab bar shows before it gets cramped. */
const TAB_BAR_LIMIT = 4;

function useIsDesktop(): boolean {
  // Starts false so the server render and the first client render agree —
  // rendering a column on one and a drawer on the other is a hydration
  // mismatch. The effect corrects it before the sidebar becomes interactive.
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
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

export function Sidebar({ defaultOpen = false }: SidebarProps = {}) {
  const { t } = useI18n();
  const { user } = useSession();
  const pathname = usePathname();
  const isDesktop = useIsDesktop();

  const [isOpen, setIsOpen] = useState(defaultOpen);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const drawerId = useId();

  const isAdmin = user?.role === "admin";
  const links = visibleNavLinks(isAdmin);

  const close = useCallback(() => setIsOpen(false), []);
  const open = useCallback(() => setIsOpen(true), []);
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

  const isCurrent = (href: string) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href) === true;

  const focusRing =
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400";

  const linkClassName = (href: string) =>
    [
      "flex min-h-[44px] items-center rounded px-3 py-2 text-sm",
      focusRing,
      isCurrent(href)
        ? "bg-slate-100 font-medium text-slate-900 dark:bg-slate-800 dark:text-slate-50"
        : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60",
    ].join(" ");

  const navContent = (
    <nav
      aria-label={t("navigation.secondary")}
      data-testid="sidebar-nav"
      className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3"
    >
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          {...(link.tour ? { "data-tour": link.tour } : {})}
          {...(isCurrent(link.href) ? { "aria-current": "page" as const } : {})}
          className={linkClassName(link.href)}
        >
          {t(link.labelKey)}
        </Link>
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
        onClick={toggle}
        aria-expanded={isOpen}
        aria-controls={drawerId}
        aria-label={isOpen ? t("sidebar.close") : t("sidebar.open")}
        data-testid="sidebar-toggle"
        className={`fixed left-3 top-3 z-40 flex h-11 w-11 items-center justify-center rounded border border-slate-300 bg-white text-slate-700 shadow ${focusRing} dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200`}
      >
        <span aria-hidden="true">{isOpen ? "✕" : "☰"}</span>
      </button>

      {isOpen && (
        <div
          data-testid="sidebar-overlay"
          onClick={close}
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
            onClick={close}
            aria-label={t("sidebar.close")}
            className={`flex h-11 w-11 items-center justify-center rounded border border-slate-300 text-slate-700 ${focusRing} dark:border-slate-600 dark:text-slate-200`}
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        {navContent}
      </div>
    </>
  );
}

export default Sidebar;