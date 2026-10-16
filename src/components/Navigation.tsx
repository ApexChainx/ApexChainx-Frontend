"use client";
/** ApexChain Network Operations Intelligence Platform */

import { useHealth } from "@/hooks/useHealth";
import { useSession } from "@/hooks/useSession";
import { STELLAR_NETWORK } from "@/lib/explorer";
import { useI18n } from "@/i18n/i18n";
import Link from "next/link";

// Routes only visible to admin users
const ADMIN_ROUTES = ["/webhooks", "/config"];

const Navigation = () => {
  const { state, user, logout } = useSession();
  const { t } = useI18n();
  const isAdmin = user?.role === "admin";
  const { status, isOffline } = useHealth();

  return (
    <>
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
              MAINNET
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
                  admin
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

export default Navigation;

// Export admin route list so RouteGuard can use it
export { ADMIN_ROUTES };
