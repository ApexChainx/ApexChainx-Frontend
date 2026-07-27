"use client";
/** ApexChain Network Operations Intelligence Platform */

import { useSession } from "@/hooks/useSession";
import Link from "next/link";

import { useHealth } from "@/hooks/useHealth";

// Routes only visible to admin users
const ADMIN_ROUTES = ["/webhooks", "/config"];

const Navigation = () => {
  const { state, user, logout } = useSession();
  const isAdmin = user?.role === "admin";
  const { status, isOffline } = useHealth();

  return (
    <>
      {isOffline && (
        <div className="bg-red-500 text-white text-center py-2 text-sm font-semibold sticky top-0 z-50">
          You are currently offline. Some features may be unavailable.
        </div>
      )}
      <nav style={{ padding: "1rem", borderBottom: "1px solid #ccc" }} className="flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div
            className={`w-3 h-3 rounded-full mr-2 ${
              status === "green"
                ? "bg-green-500"
                : status === "yellow"
                ? "bg-yellow-500"
                : "bg-red-500"
            }`}
            title={`System Health: ${status}`}
          />
          <Link href="/">Dashboard</Link>
          <span>|</span>
          <Link href="/outages">Outages</Link>
          <span>|</span>
          <Link href="/bulk-import">Bulk Import</Link>
          <span>|</span>
          <Link href="/payments">Payments</Link>
          <span>|</span>
          <Link href="/payments/retry-queue">Retry Queue</Link>
          <span>|</span>
          <Link href="/setting">Settings</Link>
          {isAdmin && (
            <>
              <span>|</span>
              <Link href="/config">SLA Config</Link>
              <span>|</span>
              <Link href="/webhooks">Webhooks</Link>
            </>
          )}
        </div>

        <div className="text-sm text-slate-600">
          {state === "loading" && (
            <span className="text-slate-400">Checking session…</span>
          )}
          {state === "authenticated" && user && (
            <span className="flex items-center gap-3">
              <span>{user.email}</span>
              {isAdmin && (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-500">
                  admin
                </span>
              )}
              <button
                onClick={() => void logout()}
                className="rounded border border-slate-200 px-2 py-0.5 text-xs hover:bg-slate-100"
              >
                Sign out
              </button>
            </span>
          )}
          {state === "unauthenticated" && (
            <Link
              href="/login"
              className="rounded border border-slate-200 px-2 py-0.5 text-xs hover:bg-slate-100"
            >
              Sign in
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
