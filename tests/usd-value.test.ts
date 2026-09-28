/** ApexChain Frontend Test Suite */
import { describe, expect, it } from "vitest";

import { getUsdValue } from "@/lib/usd-value";

/**
 * Issue #617 — USD conversion used to return null both when an asset had no
 * CoinGecko rate and when the rate service failed, so the balances list
 * silently omitted USD lines. These tests pin the discriminated result for
 * the three states (rate present, asset missing, service failed) plus the
 * no-rate-data case that must keep the previous rendering behaviour.
 */
describe("getUsdValue (Issue #617)", () => {
  const rates = { XLM: 0.1, USDC: 1 };

  it("returns a formatted USD value when the asset has a rate", () => {
    expect(getUsdValue(rates, null, "XLM", "100")).toEqual({
      kind: "value",
      usd: "10.00",
    });
    expect(getUsdValue(rates, null, "USDC", "12.5")).toEqual({
      kind: "value",
      usd: "12.50",
    });
  });

  it("reports no-rate when rates loaded but the asset has none", () => {
    expect(getUsdValue(rates, null, "BTC", "1")).toEqual({ kind: "no-rate" });
    // An empty rate map still counts as "loaded" — the service answered.
    expect(getUsdValue({}, null, "XLM", "1")).toEqual({ kind: "no-rate" });
  });

  it("reports error when the rate service failed", () => {
    expect(getUsdValue(null, "CoinGecko API error: 500", "XLM", "100")).toEqual({
      kind: "error",
    });
    // The service failure wins even if a stale rate map is present.
    expect(getUsdValue(rates, "boom", "XLM", "100")).toEqual({ kind: "error" });
  });

  it("reports pending while rates are loading or not fetched", () => {
    expect(getUsdValue(null, null, "XLM", "100")).toEqual({ kind: "pending" });
  });

  it("reports pending for an unparseable balance (previous behaviour)", () => {
    expect(getUsdValue(rates, null, "XLM", "not-a-number")).toEqual({
      kind: "pending",
    });
  });
});
