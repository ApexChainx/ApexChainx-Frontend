/** ApexChain Frontend Test Suite */
/**
 * Issue #618 — Unit tests for the useUsdRates hook.
 *
 * Covers the externalized rate endpoint (env var with a documented CoinGecko
 * default) and the offline last-good snapshot behaviour: a failed fetch
 * serves the cached snapshot with `isStale` set and `error` left unset, while
 * a failed fetch with no snapshot reports a normal error state.
 *
 * The hook keeps its store at module scope (shared across hook instances via
 * useSyncExternalStore), so each test resets it through the exported
 * `__resetUsdRatesStoreForTests` seam.
 */
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const mockCacheGet = vi.fn();
const mockCacheSet = vi.fn();
vi.mock("@/lib/persisted-cache", () => ({
  persistedCache: {
    get: (...a: unknown[]) => mockCacheGet(...a),
    set: (...a: unknown[]) => mockCacheSet(...a),
    del: vi.fn(),
    clear: vi.fn(),
  },
}));

// The hook only fetches on mainnet; force mainnet so the fetch path runs.
vi.mock("@/lib/explorer", () => ({ STELLAR_NETWORK: "mainnet" }));

import { __resetUsdRatesStoreForTests, useUsdRates } from "@/hooks/useUsdRates";

const RATES = { USDC: 1, XLM: 0.1, APEX: 2 };

/** Minimal fetch-response stand-in — the hook only reads `ok` and `json()`. */
function jsonResponse(body: unknown) {
  return { ok: true, json: async () => body };
}

function coingeckoPayload() {
  return jsonResponse({
    "usd-coin": { usd: 1 },
    stellar: { usd: 0.1 },
    apex: { usd: 2 },
  });
}

describe("useUsdRates", () => {
  beforeEach(() => {
    __resetUsdRatesStoreForTests();
    mockFetch.mockReset();
    mockCacheGet.mockReset();
    mockCacheSet.mockReset();
    mockCacheGet.mockResolvedValue(null);
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("fetches from NEXT_PUBLIC_USD_RATE_URL when the env var is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_USD_RATE_URL", "https://rates.example.com/api");
    mockFetch.mockResolvedValueOnce(coingeckoPayload());

    const { result } = renderHook(() => useUsdRates());

    await waitFor(() => expect(result.current.rates).toEqual(RATES));
    expect(mockFetch).toHaveBeenCalledWith("https://rates.example.com/api");
    expect(result.current.isStale).toBe(false);
  });

  it("falls back to the documented CoinGecko default when the env var is unset", async () => {
    mockFetch.mockResolvedValueOnce(coingeckoPayload());

    const { result } = renderHook(() => useUsdRates());

    await waitFor(() => expect(result.current.rates).toEqual(RATES));
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.coingecko.com/api/v3/simple/price?ids=usd-coin,stellar,apex&vs_currencies=usd",
    );
    expect(result.current.isStale).toBe(false);
  });

  it("persists a last-good snapshot to the persisted cache on a successful fetch", async () => {
    mockFetch.mockResolvedValueOnce(coingeckoPayload());

    const { result } = renderHook(() => useUsdRates());

    await waitFor(() => expect(result.current.rates).toEqual(RATES));
    expect(mockCacheSet).toHaveBeenCalledWith(
      "usd-rates-snapshot",
      { rates: RATES, fetchedAt: expect.any(Number) },
      expect.any(Number),
    );
  });

  it("serves the cached snapshot with isStale when the fetch fails", async () => {
    mockCacheGet.mockResolvedValue({ rates: RATES, fetchedAt: 1_000 });
    mockFetch.mockRejectedValueOnce(new Error("network down"));

    const { result } = renderHook(() => useUsdRates());

    await waitFor(() => expect(result.current.isStale).toBe(true));
    // The snapshot keeps balances renderable and error stays unset so the UI
    // can distinguish "stale snapshot" from "failed, no snapshot".
    expect(result.current.rates).toEqual(RATES);
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("reports an error when the fetch fails and no snapshot exists", async () => {
    mockCacheGet.mockResolvedValue(null);
    mockFetch.mockRejectedValueOnce(new Error("network down"));

    const { result } = renderHook(() => useUsdRates());

    await waitFor(() => expect(result.current.error).toBe("network down"));
    expect(result.current.rates).toBeNull();
    expect(result.current.isStale).toBe(false);
    expect(result.current.loading).toBe(false);
  });
});
