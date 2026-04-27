"use client";

import Link from "next/link";
import { useSession } from "@/hooks/useSession";

// Routes only visible to admin users
const ADMIN_ROUTES = ["/webhooks", "/config"];

const Navigation = () => {
  const { state, user, logout } = useSession();
  const isAdmin = user?.role === "admin";

  return (
    <nav style={{ padding: "1rem", borderBottom: "1px solid #ccc" }} className="flex items-center justify-between">
      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/">Dashboard</Link>
        <span>|</span>
        <Link href="/outages">Outages</Link>
        <span>|</span>
        <Link href="/bulk-import">Bulk Import</Link>
        <span>|</span>
        <Link href="/payments">Payments</Link>
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
  );
};

export default Navigation;

// Export admin route list so RouteGuard can use it
export { ADMIN_ROUTES };
