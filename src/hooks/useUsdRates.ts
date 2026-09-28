"use client";
/** ApexChain Network Operations Intelligence Platform */
/**
 * Hook: useUsdRates
 *
 * Issue #618 — Externalized rate endpoint + offline last-good snapshot.
 *
 * The USD rate endpoint is read from `NEXT_PUBLIC_USD_RATE_URL` at call time
 * and falls back to the documented CoinGecko default when the env var is
 * unset, so a rate-source change no longer requires a code edit + redeploy:
 *
 *   NEXT_PUBLIC_USD_RATE_URL=https://api.coingecko.com/api/v3/simple/price?ids=usd-coin,stellar,apex&vs_currencies=usd
 *
 * On every successful fetch the rates snapshot is written to the persisted
 * cache (key "usd-rates-snapshot") so an unreachable rate source can be
 * survived: when a fetch fails, the last-good snapshot is served with
 * `isStale: true` and `error` left unset, so balances stay renderable and the
 * UI can surface a "rates may be stale" warning. When no snapshot exists the
 * hook reports a normal error state instead.
 */

import { useEffect, useSyncExternalStore } from "react";
import { STELLAR_NETWORK } from "@/lib/explorer";
import { persistedCache } from "@/lib/persisted-cache";

// ─── Types ───────────────────────────────────────────────────────────────────
interface CoinGeckoPriceResponse {
  [assetId: string]: {
    usd: number;
  };
}

interface RatesState {
  rates: Record<string, number> | null;
  loading: boolean;
  error: string | null;
  isStale: boolean;
}

/** Shape of the last-good snapshot persisted in the offline cache. */
interface UsdRatesSnapshot {
  rates: Record<string, number>;
  fetchedAt: number; // epoch ms when the snapshot was captured
}

// ─── Constants ───────────────────────────────────────────────────────────────
const COINGECKO_BASE = "https://api.coingecko.com/api/v3";
const CACHE_TTL_MS = 60_000; // 1 minute
const STELLAR_ASSET_IDS: Record<string, string> = {
  USDC: "usd-coin",
  XLM: "stellar",
  APEX: "apex",
};

/** Documented default endpoint (Issue #618). */
const DEFAULT_USD_RATE_URL = `${COINGECKO_BASE}/simple/price?ids=${Object.values(
  STELLAR_ASSET_IDS,
).join(",")}&vs_currencies=usd`;

/** Persisted-cache key for the last-good snapshot (Issue #618). */
const SNAPSHOT_CACHE_KEY = "usd-rates-snapshot";
/** The snapshot outlives the 60s in-memory TTL by a wide margin so an
 *  offline rate source still leaves a usable last-good behind. */
const SNAPSHOT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ─── External store ──────────────────────────────────────────────────────────
// The rates cache is shared across every hook instance, so it lives at module
// scope and is exposed through useSyncExternalStore. That keeps reactivity
// correct without setState-in-effect workarounds (forceRender hacks) —
// subscribers simply re-render whenever the store version changes.

let store: RatesState = { rates: null, loading: false, error: null, isStale: false };
let fetchedAt = 0;
let inFlight = false;
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): RatesState {
  return store;
}

function isCacheFresh(): boolean {
  return Date.now() - fetchedAt < CACHE_TTL_MS;
}

/** Resolve the rate endpoint from env, falling back to the documented
 *  CoinGecko default. Read at call time so tests can stub the env var. */
function resolveRateEndpoint(): string {
  return process.env.NEXT_PUBLIC_USD_RATE_URL || DEFAULT_USD_RATE_URL;
}

async function fetchRatesFromSource(): Promise<Record<string, number>> {
  const url = resolveRateEndpoint();

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Rate API error: ${response.status}`);
  }

  const data: CoinGeckoPriceResponse = await response.json();

  const rates: Record<string, number> = {};
  for (const [assetCode, coingeckoId] of Object.entries(STELLAR_ASSET_IDS)) {
    const price = data[coingeckoId]?.usd;
    if (typeof price === "number") {
      rates[assetCode] = price;
    }
  }

  return rates;
}

/** Kick off a fetch unless fresh rates are already cached or in flight. */
function ensureRatesFresh(): void {
  if (isCacheFresh() || inFlight) return;

  inFlight = true;
  store = { ...store, loading: true, error: null };
  emitChange();

  fetchRatesFromSource()
    .then((rates) => {
      fetchedAt = Date.now();
      store = { rates, loading: false, error: null, isStale: false };
      // Persist the last-good snapshot for offline degradation (Issue #618).
      void persistedCache.set(
        SNAPSHOT_CACHE_KEY,
        { rates, fetchedAt } satisfies UsdRatesSnapshot,
        SNAPSHOT_TTL_MS,
      );
    })
    .catch(async (err: unknown) => {
      const message = err instanceof Error ? err.message : "Failed to fetch rates";
      // Issue #618 — serve the last-good snapshot when the rate source is
      // unreachable so balances stay renderable. `error` is deliberately left
      // unset so the UI can distinguish "stale snapshot" from "failed, no
      // snapshot" via the `isStale` flag.
      const snapshot = await persistedCache.get<UsdRatesSnapshot>(SNAPSHOT_CACHE_KEY);
      const fallbackRates = snapshot?.rates ?? store.rates;
      store = fallbackRates
        ? { rates: fallbackRates, loading: false, error: null, isStale: true }
        : { rates: null, loading: false, error: message, isStale: false };
    })
    .finally(() => {
      inFlight = false;
      emitChange();
    });
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useUsdRates(): {
  rates: Record<string, number> | null;
  loading: boolean;
  error: string | null;
  isStale: boolean;
  isMainnet: boolean;
} {
  const isMainnet = STELLAR_NETWORK === "mainnet";

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // Trigger the shared fetch; the store update happens asynchronously (or not
  // at all when the cache is fresh), never synchronously during render.
  useEffectBridge(isMainnet);

  return { ...state, isMainnet };
}

/** Trigger the shared fetch once per mount/network change. */
function useEffectBridge(isMainnet: boolean): void {
  useEffect(() => {
    if (!isMainnet) return;
    ensureRatesFresh();
  }, [isMainnet]);
}

// ─── Test seam ───────────────────────────────────────────────────────────────
// The module keeps its rates store at module scope (shared across hook
// instances via useSyncExternalStore), so tests reset it between cases.
/** Reset the module-level store. Intended for unit tests only. */
export function __resetUsdRatesStoreForTests(): void {
  store = { rates: null, loading: false, error: null, isStale: false };
  fetchedAt = 0;
  inFlight = false;
}
