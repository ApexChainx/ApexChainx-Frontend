/** ApexChain Network Operations Intelligence Platform */
/**
 * Hook: useStellarHealth
 *
 * Issue #128 — Pre-flight check: ensure Stellar API base URL is reachable before action.
 *
 * Pings the Horizon (/) endpoint on mount and periodically thereafter, returning
 * connectivity status and measured latency so the UI can gate action buttons or
 * surface a friendly error to the operator.
 */

import { useState, useEffect, useRef } from "react";

export type StellarHealthStatus = "checking" | "reachable" | "unreachable";

export interface StellarHealthState {
  status: StellarHealthStatus;
  latencyMs: number | null;
  lastChecked: Date | null;
}

const DEFAULT_HORIZON_URL = "https://horizon-testnet.stellar.org";
const POLL_INTERVAL_MS = 30_000; // 30 seconds
const TIMEOUT_MS = 5_000; // 5 seconds

/**
 * Resolve the Horizon URL from the environment, falling back to testnet.
 * In Next.js client components, process.env.NEXT_PUBLIC_* is replaced at
 * build time by the framework.
 */
function getHorizonUrl(): string {
  return (
    (typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL
      : undefined) ?? DEFAULT_HORIZON_URL
  );
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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      const latency = await pingHorizon(horizonUrl);
      if (!mounted) return;

      setState({
        status: latency !== null ? "reachable" : "unreachable",
        latencyMs: latency,
        lastChecked: new Date(),
      });
    };

    // Immediate first check
    void check();

    // Periodic re-check
    intervalRef.current = setInterval(check, POLL_INTERVAL_MS);

    return () => {
      mounted = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [horizonUrl]);

  return state;
}
