"use client";
/** ApexChain Network Operations Intelligence Platform */

import { useEffect, useSyncExternalStore } from "react";
import { STELLAR_NETWORK } from "@/lib/explorer";

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
}

// ─── Constants ───────────────────────────────────────────────────────────────
const COINGECKO_BASE = "https://api.coingecko.com/api/v3";
const CACHE_TTL_MS = 60_000; // 1 minute
const STELLAR_ASSET_IDS: Record<string, string> = {
  USDC: "usd-coin",
  XLM: "stellar",
  APEX: "apex",
};

// ─── External store ──────────────────────────────────────────────────────────
// The rates cache is shared across every hook instance, so it lives at module
// scope and is exposed through useSyncExternalStore. That keeps reactivity
// correct without setState-in-effect workarounds (forceRender hacks) —
// subscribers simply re-render whenever the store version changes.

let store: RatesState = { rates: null, loading: false, error: null };
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

async function fetchRatesFromCoinGecko(): Promise<Record<string, number>> {
  const ids = Object.values(STELLAR_ASSET_IDS).join(",");
  const url = `${COINGECKO_BASE}/simple/price?ids=${ids}&vs_currencies=usd`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`CoinGecko API error: ${response.status}`);
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

  fetchRatesFromCoinGecko()
    .then((rates) => {
      fetchedAt = Date.now();
      store = { rates, loading: false, error: null };
    })
    .catch((err: unknown) => {
      store = {
        ...store,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to fetch rates",
      };
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
