"use client";
/** ApexChain Network Operations Intelligence Platform */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState, useEffect } from "react";

import { registerQueryClient } from "@/lib/session-snapshot";

/**
 * Issue #622 — app-wide React Query defaults.
 *
 * Every hook used to re-declare its own staleTime/gcTime/retry/
 * refetchOnWindowFocus policy, which produced inconsistent behaviour across
 * features (payments vs outages vs config) and made it easy to forget
 * window-focus misfetch or retry storms on a new hook. These defaults are the
 * app-wide policy; per-query options intentionally override them where
 * operational needs differ (e.g. useOutages keeps a 5-minute stale window).
 *
 * Policy:
 * - staleTime 30s: freshly fetched data is served from cache for 30s, so
 *   rapid navigation and re-renders do not trigger duplicate network calls.
 * - gcTime 5m: unused queries are kept in the cache for 5 minutes so
 *   back-navigation can still render instantly.
 * - retry: at most 2 retries (3 attempts total) with exponential backoff
 *   capped at 10s, so a flapping endpoint cannot turn into a retry storm.
 * - refetchOnWindowFocus: false — refetching every query when the operator
 *   switches back to the tab caused background misfetch storms; a query that
 *   genuinely needs fresh-on-focus data must opt in explicitly.
 */
export const defaultQueryOptions = {
  staleTime: 30_000, // 30 seconds
  gcTime: 5 * 60_000, // 5 minutes
  retry: (failureCount: number) => failureCount < 2,
  retryDelay: (failureCount: number) => Math.min(1000 * 2 ** failureCount, 10_000),
  refetchOnWindowFocus: false,
} as const;

/**
 * Issue #622 — QueryClient factory. Exported so tests can assert the exact
 * defaultOptions shape without mounting the provider.
 */
export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        ...defaultQueryOptions,
      },
    },
  });
}

export function ReactQueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => createAppQueryClient());

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
