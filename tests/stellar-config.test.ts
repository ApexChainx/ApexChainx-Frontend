/** ApexChain Network Operations Intelligence Platform */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Capture the real env values before we control them in tests.
const ORIGINAL_NETWORK = process.env.NEXT_PUBLIC_STELLAR_NETWORK;
const ORIGINAL_HORIZON = process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL;

function setStellarEnv(network?: string, horizon?: string) {
  if (network === undefined) delete process.env.NEXT_PUBLIC_STELLAR_NETWORK;
  else process.env.NEXT_PUBLIC_STELLAR_NETWORK = network;
  if (horizon === undefined) delete process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL;
  else process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL = horizon;
}

describe("Stellar config single source of truth", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    setStellarEnv(ORIGINAL_NETWORK, ORIGINAL_HORIZON);
    vi.restoreAllMocks();
  });

  it("routes explorer through the shared env defaults (testnet)", async () => {
    setStellarEnv(undefined, undefined);
    const { env } = await import("@/lib/config/env");
    const explorer = await import("@/lib/explorer");

    expect(env.STELLAR_NETWORK).toBe("testnet");
    expect(env.STELLAR_HORIZON_URL).toBe("https://horizon-testnet.stellar.org");
    expect(explorer.STELLAR_NETWORK).toBe("testnet");
    expect(explorer.explorerLink("account", "GABC")).toContain("explorer/testnet");
  });

  it("routes explorer through a shared env override (mainnet)", async () => {
    setStellarEnv("mainnet", "https://horizon.stellar.org");
    const { env } = await import("@/lib/config/env");
    const explorer = await import("@/lib/explorer");

    expect(env.STELLAR_NETWORK).toBe("mainnet");
    expect(env.STELLAR_HORIZON_URL).toBe("https://horizon.stellar.org");
    expect(explorer.STELLAR_NETWORK).toBe("mainnet");
    expect(explorer.explorerLink("tx", "abc")).toContain("explorer/public");
  });
});
