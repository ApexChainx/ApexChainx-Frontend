/** ApexChain - Network Operations Intelligence Platform */
/**
 * Hook: useStellarHealth
 *
 * Issue #128 — Pre-flight check: ensure Stellar API base URL is reachable before action.
 *
 * Pings the Horizon (/) endpoint on mount and periodically thereafter, returning
 * connectivity status and measured latency so the UI can gate action buttons or
 * surface a friendly error to the operator.
 *
 * Issue #624 — Migrated from a hand-rolled useState+useEffect poller onto
 * React Query: the query key comes from the factory (slaEventKeys.stellarHealth)
 * and `refetchInterval` replaces the bespoke setInterval + AbortController
 * teardown. pingHorizon still owns the per-request 5s timeout.
 */

import { useQuery } from "@tanstack/react-query";

import { env } from "@/lib/config/env";
import { slaEventKeys } from "@/lib/query-keys";

export type StellarHealthStatus = "checking" | "reachable" | "unreachable";

export interface StellarHealthState {
  status: StellarHealthStatus;
  latencyMs: number | null;
  lastChecked: Date | null;
}

const POLL_INTERVAL_MS = 30_000; // 30 seconds
const TIMEOUT_MS = 5_000; // 5 seconds

/**
 * Resolve the Horizon URL from the single source of truth in env.ts.
 * In Next.js client components, process.env.NEXT_PUBLIC_* is replaced at
 * build time by the framework.
 */
function getHorizonUrl(): string {
  return env.STELLAR_HORIZON_URL;
}

/**
 * Ping the Horizon root endpoint and return the measured latency in ms.
 * Returns `null` when the request fails or times out.
 */
async function pingHorizon(url: string): Promise<number | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const start = performance.now();
  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) return null;
    return Math.round(performance.now() - start);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * useStellarHealth
 *
 * Returns the current Horizon connectivity state so the UI can:
 *  - Show a coloured badge (latency or "unreachable")
 *  - Disable payment / resolve buttons when unreachable
 *  - Display a friendly error banner
 */
export function useStellarHealth(): StellarHealthState {
  const horizonUrl = getHorizonUrl();

  const query = useQuery({
    queryKey: slaEventKeys.stellarHealth,
    queryFn: () => pingHorizon(horizonUrl),
    refetchInterval: POLL_INTERVAL_MS,
    // The poller is the single re-check path; keep window focus from
    // triggering extra pings the old setInterval loop never did.
    refetchOnWindowFocus: false,
  });

  // pingHorizon resolves `null` on failure instead of throwing, so `data`
  // (not `error`) carries the check outcome.
  const checked = query.data !== undefined;

  return {
    status: !checked ? "checking" : query.data !== null ? "reachable" : "unreachable",
    latencyMs: query.data ?? null,
    lastChecked: checked ? new Date() : null,
  };
}
