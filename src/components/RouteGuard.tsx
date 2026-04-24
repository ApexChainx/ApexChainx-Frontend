"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "@/hooks/useSession";

// Routes that do not require authentication
const PUBLIC_PATHS = ["/login", "/register"];

export default function RouteGuard({ children }: { children: React.ReactNode }) {
  const { state } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (state === "unauthenticated" && !isPublic) {
      router.replace("/login");
    }
  }, [state, isPublic, router]);

  // Don't flash protected content while resolving session
  if (state === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">
        Loading…
      </div>
    );
  }

  if (state === "unauthenticated" && !isPublic) {
    return null;
  }

  return <>{children}</>;
}
