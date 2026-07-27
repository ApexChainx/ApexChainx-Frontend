"use client";
/** ApexChain Network Operations Intelligence Platform */

import { STELLAR_NETWORK } from "@/lib/explorer";
import { useEffect, useRef, useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface CoinGeckoPriceResponse {
  [assetId: string]: {
    usd: number;
  };
}

interface CachedRates {
  rates: Record<string, number>;
  fetchedAt: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const COINGECKO_BASE = "https://api.coingecko.com/api/v3";
const CACHE_TTL_MS = 60_000; // 1 minute
const STELLAR_ASSET_IDS: Record<string, string> = {
  USDC: "usd-coin",
  XLM: "stellar",
  APEX: "apex",
};

// Global cache shared across hook instances
let globalCache: CachedRates | null = null;

function isCacheValid(cache: CachedRates): boolean {
  return Date.now() - cache.fetchedAt < CACHE_TTL_MS;
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

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useUsdRates(): {
  rates: Record<string, number> | null;
  loading: boolean;
  error: string | null;
  isMainnet: boolean;
} {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMainnet = STELLAR_NETWORK === "mainnet";
  const fetchingRef = useRef(false);

  // Re-render when cache populates
  const [, forceRender] = useState(0);

  useEffect(() => {
    if (!isMainnet) return;

    // Return cached rates immediately if fresh
    if (globalCache && isCacheValid(globalCache)) {
      forceRender((n) => n + 1);
      return;
    }

    // Prevent duplicate in-flight requests
    if (fetchingRef.current) return;

    const controller = new AbortController();
    fetchingRef.current = true;

    setLoading(true);
    setError(null);

    fetchRatesFromCoinGecko()
      .then((rates) => {
        if (controller.signal.aborted) return;
        globalCache = { rates, fetchedAt: Date.now() };
        fetchingRef.current = false;
        setLoading(false);
        forceRender((n) => n + 1);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        fetchingRef.current = false;
        setError(err instanceof Error ? err.message : "Failed to fetch rates");
        setLoading(false);
      });

    return () => {
      controller.abort();
      fetchingRef.current = false;
    };
  }, [isMainnet]); // eslint-disable-line react-hooks/exhaustive-deps

  const rates = globalCache && isCacheValid(globalCache) ? globalCache.rates : null;

  return { rates, loading, error, isMainnet };
}
