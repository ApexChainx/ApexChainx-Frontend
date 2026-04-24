"use client";

import Link from "next/link";
import { useSession } from "@/hooks/useSession";

const Navigation = () => {
  const { state, user, logout } = useSession();

  return (
    <nav style={{ padding: "1rem", borderBottom: "1px solid #ccc" }} className="flex items-center justify-between">
      <div className="flex gap-3">
        <Link href="/">Dashboard</Link> |{" "}
        <Link href="/outages">Outages</Link> |{" "}
        <Link href="/bulk-import">Bulk Import</Link> |{" "}
        <Link href="/webhooks">Webhooks</Link> |{" "}
        <Link href="/payments">Payments</Link> |{" "}
        <Link href="/setting">Wallet &amp; Settings</Link>
      </div>

      <div className="text-sm text-slate-600">
        {state === "loading" && (
          <span className="text-slate-400">Checking session…</span>
        )}
        {state === "authenticated" && user && (
          <span className="flex items-center gap-3">
            <span>{user.email}</span>
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
