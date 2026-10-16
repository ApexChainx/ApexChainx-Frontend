"use client";
/** ApexChain Network Operations Intelligence Platform */

import { Fragment, memo, useCallback, useMemo } from "react";

import { useHealth } from "@/hooks/useHealth";
import { useSession } from "@/hooks/useSession";
import { STELLAR_NETWORK } from "@/lib/explorer";
import { useI18n } from "@/i18n/i18n";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_LINKS, NavLinks } from "@/components/shell/nav-links";

interface NavLink {
  href: string;
  label: string;
  tour?: string;
}

const Navigation = () => {
  const { state, user, logout } = useSession();
  const { t } = useI18n();
  const { status, isOffline } = useHealth();
  const pathname = usePathname();

  // The dashboard ("/") is only current on an exact match; every other route
  // is "current" for itself and any nested path beneath it.
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href) === true;

  const currentPageAttrs = (href: string) =>
    isActive(href) ? ({ "aria-current": "page" } as const) : {};

  // Derived once per identity change instead of on every render.
  const isAdmin = useMemo(() => user?.role === "admin", [user?.role]);

  const handleLogout = useCallback(() => {
    void logout();
  }, [logout]);

  // The public link list is rebuilt only when the translator changes, so the
  // rendered anchor elements keep stable descriptions across re-renders.
  const publicLinks = useMemo<NavLink[]>(
    () => [
      { href: "/", label: t('common.dashboard'), tour: "nav-dashboard" },
      { href: "/outages", label: t('common.outages'), tour: "nav-outages" },
      { href: "/bulk-import", label: t('common.bulkImport') },
      { href: "/payments", label: t('common.payments'), tour: "nav-payments" },
      { href: "/setting", label: t('common.settings') },
      { href: "/payments/retry-queue", label: t('common.retryQueue') },
    ],
    [t],
  );

  const adminLinks = useMemo<NavLink[]>(
    () => [
      { href: "/config", label: t('common.config') },
      { href: "/webhooks", label: t('common.webhooks') },
    ],
    [t],
  );

  return (
    <>
      {/* First focusable element in the app: lets keyboard users jump past
          the navigation straight to the page content. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-blue-700 focus:shadow"
      >
        {t('common.skipToContent')}
      </a>
      {isOffline && (
        <div
          role="status"
          aria-live="polite"
          className="sticky top-0 z-50 bg-red-500 py-2 text-center text-sm font-semibold text-white"
        >
          {t('errors.offline')}
        </div>
      )}
      <nav
        aria-label={t('navigation.primary')}
        className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-gray-300 px-4 py-3 text-sm sm:px-6 sm:py-4"
      >
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 text-sm [&_a]:focus-visible:outline-2 [&_a]:focus-visible:outline-offset-2 [&_a]:focus-visible:outline-blue-600">
          <span
            role="img"
            aria-label={`${t('navigation.systemHealth')}: ${status}`}
            className={`mr-2 inline-block h-3 w-3 shrink-0 rounded-full ${
              status === "green" ? "bg-green-500" : "bg-red-500"
            }`}
          />
          {STELLAR_NETWORK === "mainnet" && (
            <span className="rounded bg-red-600 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-white animate-pulse">
              {t('common.mainnet')}
            </span>
          )}
          <Link href="/" data-tour="nav-dashboard">{t('common.dashboard')}</Link>
          <span aria-hidden="true" className="hidden sm:inline">|</span>
          <Link href="/outages" data-tour="nav-outages">{t('common.outages')}</Link>
          <span aria-hidden="true" className="hidden sm:inline">|</span>
          <Link href="/bulk-import">{t('common.bulkImport')}</Link>
          <span aria-hidden="true" className="hidden sm:inline">|</span>
          <Link href="/payments" data-tour="nav-payments">{t('common.payments')}</Link>
          <span aria-hidden="true" className="hidden sm:inline">|</span>
          <Link href="/setting">{t('common.settings')}</Link>
          <span aria-hidden="true" className="hidden sm:inline">|</span>
          <Link href="/payments/retry-queue">Retry Queue</Link>
          {isAdmin && (
            <>
              <span aria-hidden="true" className="hidden sm:inline">|</span>
              <Link href="/config">{t('common.config')}</Link>
              <span aria-hidden="true" className="hidden sm:inline">|</span>
              <Link href="/webhooks">{t('common.webhooks')}</Link>
            </>
          )}
        </div>

        <div className="flex min-w-0 flex-wrap items-center justify-end gap-3 text-sm text-slate-600">
          {state === "loading" && (
            <span className="text-slate-600">{t('settings.loadingSession')}</span>
          )}
          {state === "authenticated" && user && (
            <span className="flex min-w-0 items-center gap-3">
              <span className="max-w-[12rem] truncate" title={user.email}>{user.email}</span>
              {isAdmin && (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                  {t('common.admin')}
                </span>
              )}
              <button
                onClick={() => void logout()}
                className="rounded border border-slate-200 px-2 py-0.5 text-xs hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                {t('common.signOut')}
              </button>
            </span>
          )}
          {state === "unauthenticated" && (
            <Link
              href="/login"
              className="rounded border border-slate-200 px-2 py-0.5 text-xs hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              {t('auth.signIn')}
            </Link>
          )}
        </div>
      </nav>
    </>
  );
};

// Navigation takes no props, but memoizing still lets React skip it when a
// parent (e.g. a layout shell) re-renders for an unrelated reason.
export default memo(Navigation);

// Export admin route list so RouteGuard can use it. Derived from the single
// source of truth (NAV_LINKS) so it can never drift from what the bar renders.
export const ADMIN_ROUTES = NAV_LINKS.filter((link) => link.adminOnly).map(
  (link) => link.href,
);
