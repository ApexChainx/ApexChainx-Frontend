"use client";
/** ApexChain Network Operations Intelligence Platform */

import { useHealth } from "@/hooks/useHealth";
import { useSession } from "@/hooks/useSession";
import { STELLAR_NETWORK } from "@/lib/explorer";
import { useI18n } from "@/i18n/i18n";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Routes only visible to admin users
const ADMIN_ROUTES = ["/webhooks", "/config"];

const Navigation = () => {
  const { state, user, logout } = useSession();
  const { t } = useI18n();
  const isAdmin = user?.role === "admin";
  const { status, isOffline } = useHealth();
  const pathname = usePathname();

  // The dashboard ("/") is only current on an exact match; every other route
  // is "current" for itself and any nested path beneath it.
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href) === true;

  const currentPageAttrs = (href: string) =>
    isActive(href) ? ({ "aria-current": "page" } as const) : {};

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
        <div className="bg-red-500 text-white text-center py-2 text-sm font-semibold sticky top-0 z-50">
          {t('errors.offline')}
        </div>
      )}
      <nav
        aria-label={t('navigation.primary')}
        style={{ padding: "1rem", borderBottom: "1px solid #ccc" }}
        className="flex items-center justify-between"
      >
        <div className="flex flex-wrap items-center gap-3 text-sm [&_a]:focus-visible:outline-2 [&_a]:focus-visible:outline-offset-2 [&_a]:focus-visible:outline-blue-600 [&_a]:focus-visible:rounded">
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
              MAINNET
            </span>
          )}
          <Link href="/" data-tour="nav-dashboard" {...currentPageAttrs("/")}>{t('common.dashboard')}</Link>
          <span>|</span>
          <Link href="/outages" data-tour="nav-outages" {...currentPageAttrs("/outages")}>{t('common.outages')}</Link>
          <span>|</span>
          <Link href="/bulk-import" {...currentPageAttrs("/bulk-import")}>{t('common.bulkImport')}</Link>
          <span>|</span>
          <Link href="/payments" data-tour="nav-payments" {...currentPageAttrs("/payments")}>{t('common.payments')}</Link>
          <span>|</span>
          <Link href="/setting" {...currentPageAttrs("/setting")}>{t('common.settings')}</Link>
          <span>|</span>
          <Link href="/payments/retry-queue" {...currentPageAttrs("/payments/retry-queue")}>Retry Queue</Link>
          {isAdmin && (
            <>
              <span>|</span>
              <Link href="/config" {...currentPageAttrs("/config")}>{t('common.config')}</Link>
              <span>|</span>
              <Link href="/webhooks" {...currentPageAttrs("/webhooks")}>{t('common.webhooks')}</Link>
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
