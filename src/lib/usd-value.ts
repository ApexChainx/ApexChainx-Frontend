/** ApexChain - USD conversion for wallet balances (Issue #617) */

/**
 * Issue #617 — converting a balance to USD. The balances list used to omit
 * the USD line entirely when an asset had no CoinGecko rate, so operators
 * could not tell whether an asset truly had no USD rate or the rate service
 * had failed. This pure helper returns a discriminated result so the UI can
 * render the three states distinctly.
 */

export type UsdValueResult =
  /** A formatted USD value, e.g. "12.50". */
  | { kind: "value"; usd: string }
  /** Rates loaded successfully, but this asset has no published rate. */
  | { kind: "no-rate" }
  /** The USD rate service failed (error state). */
  | { kind: "error" }
  /** No rate data yet (still loading, or rates are not fetched on this
   * network) — renders nothing, preserving the previous behaviour. */
  | { kind: "pending" };

/**
 * Resolve the USD value of one balance entry.
 *
 * @param rates        The loaded rate map, or null while loading / on
 *                     networks where rates are never fetched.
 * @param ratesError   The rate service's error message, or null.
 * @param assetCode    The balance record's asset key (e.g. "XLM").
 * @param balance      The balance string as reported by the backend.
 */
export function getUsdValue(
  rates: Record<string, number> | null,
  ratesError: string | null,
  assetCode: string,
  balance: string,
): UsdValueResult {
  // A failed rate service is reported separately from a missing rate so the
  // UI can distinguish "no published rate" from "rates could not be loaded".
  if (ratesError) {
    return { kind: "error" };
  }
  if (!rates) {
    return { kind: "pending" };
  }
  const rate = rates[assetCode];
  if (typeof rate !== "number") {
    return { kind: "no-rate" };
  }
  const numBalance = parseFloat(balance);
  if (isNaN(numBalance)) {
    return { kind: "pending" };
  }
  return { kind: "value", usd: (numBalance * rate).toFixed(2) };
}
