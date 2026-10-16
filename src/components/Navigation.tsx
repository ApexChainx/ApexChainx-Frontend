"use client";
/** ApexChain Network Operations Intelligence Platform */

import { Fragment, memo, useCallback, useMemo } from "react";

import { useHealth } from "@/hooks/useHealth";
import { useSession } from "@/hooks/useSession";
import { STELLAR_NETWORK } from "@/lib/explorer";
import { useI18n } from "@/i18n/i18n";
import Link from "next/link";

// Routes only visible to admin users
const ADMIN_ROUTES = ["/webhooks", "/config"];

interface NavLink {
  href: string;
  label: string;
  tour?: string;
}

const Navigation = () => {
  const { state, user, logout } = useSession();
  const { t } = useI18n();
  const { status, isOffline } = useHealth();

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
      {isOffline && (
        <div className="bg-red-500 text-white text-center py-2 text-sm font-semibold sticky top-0 z-50">
          {t('errors.offline')}
        </div>
      )}
      <nav style={{ padding: "1rem", borderBottom: "1px solid #ccc" }} className="flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div
            className={`w-3 h-3 rounded-full mr-2 ${
              status === "green"
                ? "bg-green-500"
                : "bg-red-500"
            }`}
            title={`${t('navigation.systemHealth')}: ${status}`}
          />
          {STELLAR_NETWORK === "mainnet" && (
            <span className="rounded bg-red-600 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-white animate-pulse">
              {t('common.mainnet')}
            </span>
          )}
          {publicLinks.map((link, index) => (
            <Fragment key={link.href}>
              {index > 0 && <span>|</span>}
              <Link
                href={link.href}
                {...(link.tour ? { "data-tour": link.tour } : {})}
              >
                {link.label}
              </Link>
            </Fragment>
          ))}
          {isAdmin && (
            <>
              {adminLinks.map((link) => (
                <Fragment key={link.href}>
                  <span>|</span>
                  <Link href={link.href}>{link.label}</Link>
                </Fragment>
              ))}
            </>
          )}
        </div>

        <div className="text-sm text-slate-600">
          {state === "loading" && (
            <span className="text-slate-600">{t('settings.loadingSession')}</span>
          )}
          {state === "authenticated" && user && (
            <span className="flex items-center gap-3">
              <span>{user.email}</span>
              {isAdmin && (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                  {t('common.admin')}
                </span>
              )}
              <button
                onClick={handleLogout}
                className="rounded border border-slate-200 px-2 py-0.5 text-xs hover:bg-slate-100"
              >
                {t('common.signOut')}
              </button>
            </span>
          )}
          {state === "unauthenticated" && (
            <Link
              href="/login"
              className="rounded border border-slate-200 px-2 py-0.5 text-xs hover:bg-slate-100"
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

// Export admin route list so RouteGuard can use it
export { ADMIN_ROUTES };
