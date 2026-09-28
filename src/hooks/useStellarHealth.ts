/** ApexChain Network Operations Intelligence Platform */
/**
 * Hook: useStellarHealth
 *
 * Issue #128 — Pre-flight check: ensure Stellar API base URL is reachable before action.
 *
 * Pings the Horizon (/) endpoint on mount and periodically thereafter, returning
 * connectivity status and measured latency so the UI can gate action buttons or
 * surface a friendly error to the operator.
 *
 * Issue #604 — the periodic re-check is scheduled through the shared
 * visibility-gated helper, so a backgrounded tab stops pinging Horizon and the
 * latency reading is reconciled immediately when the tab is foregrounded.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { env } from "@/lib/config/env";
import { useIntervalWhenVisible } from "@/hooks/useIntervalWhenVisible";

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
  const [state, setState] = useState<StellarHealthState>({
    status: "checking",
    latencyMs: null,
    lastChecked: null,
  });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const check = useCallback(async () => {
    const latency = await pingHorizon(horizonUrl);
    if (!mountedRef.current) return;

    setState({
      status: latency !== null ? "reachable" : "unreachable",
      latencyMs: latency,
      lastChecked: new Date(),
    });
  }, [horizonUrl]);

  // Immediate first check, then periodic re-checks — both suspended while the
  // document is hidden (issue #604).
  useIntervalWhenVisible(check, POLL_INTERVAL_MS);

  return state;
}
