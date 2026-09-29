/** ApexChain Frontend Test Suite */
/**
 * Issue #615 — stellar module tests (src/features/settings/stellar.tsx).
 *
 * Covers the Stellar network health card states (checking / reachable /
 * unreachable) and the SLA contract id card states (verified / mismatch / not
 * configured) that used to live inline in the settings page. The health hook
 * is mocked so the card rendering is tested deterministically; the provider
 * wiring is exercised through a probe component that reads the shared context
 * the wallet module uses for Horizon gating.
 */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockHealth: {
  status: "checking" | "reachable" | "unreachable";
  latencyMs: number | null;
  lastChecked: Date | null;
} = {
  status: "checking",
  latencyMs: null,
  lastChecked: null,
};

vi.mock("@/hooks/useStellarHealth", () => ({
  useStellarHealth: () => mockHealth,
}));

// Issue #640 — canonical SLA contract ids are deployment configuration now, so
// wire the testnet id before the stellar module snapshots its env.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SLA_CONTRACT_ID_TESTNET =
    "CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC";
});

import {
  SLAContractIdCard,
  StellarHealthCard,
  StellarHealthProvider,
  useStellarHealthSettings,
} from "@/features/settings/stellar";

const CANONICAL_TESTNET_ID =
  "CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC";

function renderHealth(network = "testnet") {
  return render(
    <StellarHealthProvider>
      <StellarHealthCard network={network} />
    </StellarHealthProvider>
  );
}

/** Probe: asserts the shared health context reaches nested consumers. */
function HealthGateProbe() {
  const { isHorizonUnreachable } = useStellarHealthSettings();
  return <span>{isHorizonUnreachable ? "horizon-down" : "horizon-up"}</span>;
}

describe("StellarHealthCard", () => {
  beforeEach(() => {
    mockHealth.status = "checking";
    mockHealth.latencyMs = null;
    mockHealth.lastChecked = null;
  });

  it("shows the checking state while the first ping is in flight", () => {
    renderHealth();

    expect(screen.getByText("Checking...")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows reachability and latency when Horizon responds", () => {
    mockHealth.status = "reachable";
    mockHealth.latencyMs = 42;

    renderHealth();

    expect(screen.getByText("Reachable")).toBeInTheDocument();
    expect(screen.getByText("42 ms")).toBeInTheDocument();
  });

  it("shows the unreachable banner when Horizon does not respond", () => {
    mockHealth.status = "unreachable";

    renderHealth();

    expect(screen.getByText("Unreachable")).toBeInTheDocument();
    expect(screen.getByText("Horizon is unreachable")).toBeInTheDocument();
  });

  it("exposes isHorizonUnreachable through the shared provider context", () => {
    mockHealth.status = "unreachable";

    render(
      <StellarHealthProvider>
        <HealthGateProbe />
      </StellarHealthProvider>
    );

    expect(screen.getByText("horizon-down")).toBeInTheDocument();
  });
});

describe("SLAContractIdCard", () => {
  it("shows the verified state when the configured id matches the canonical testnet id", () => {
    render(<SLAContractIdCard contractId={CANONICAL_TESTNET_ID} network="testnet" />);

    expect(screen.getByText("Verified")).toBeInTheDocument();
  });

  it("shows the mismatch state when the configured id differs from canonical", () => {
    render(<SLAContractIdCard contractId="ABC123" network="testnet" />);

    expect(screen.getByText("Mismatch")).toBeInTheDocument();
    expect(screen.getByText("Contract ID Mismatch")).toBeInTheDocument();
  });

  it("shows the not-configured state when no id is set", () => {
    render(<SLAContractIdCard network="testnet" />);

    // Both the status badge and the resolved-id field read "Not configured".
    expect(screen.getAllByText("Not configured")).toHaveLength(2);
    expect(screen.getByText("Contract not configured")).toBeInTheDocument();
  });
});