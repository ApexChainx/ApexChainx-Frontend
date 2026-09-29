/** ApexChain Frontend Test Suite */
/**
 * Issue #640 — the mainnet SLA contract id must not be a placeholder.
 *
 * The settings verification card compares the deployment's SLA_CONTRACT_ID
 * against the canonical (published) id for its network. The canonical table
 * carried `PLACEHOLDER_MAINNET_CONTRACT_ID_CHANGE_ME` for mainnet, so any real
 * mainnet deployment rendered a Mismatch badge and the Verified state was
 * unreachable on exactly the network that matters.
 *
 * The canonical ids now come from deployment configuration
 * (`NEXT_PUBLIC_SLA_CONTRACT_ID_TESTNET` / `..._MAINNET`). These tests cover
 * both halves of the acceptance criteria: the placeholder literal can never
 * come back, and a mainnet deployment wired to the published id renders the
 * Verified badge.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const PLACEHOLDER = "PLACEHOLDER_MAINNET_CONTRACT_ID_CHANGE_ME";

/** Every `.ts` / `.tsx` source file under the given directory. */
function collectSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(fullPath);
    return /\.(ts|tsx)$/.test(entry.name) ? [fullPath] : [];
  });
}

describe("canonical SLA contract id (Issue #640)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("ships no mainnet placeholder literal anywhere under src/", () => {
    const offenders = collectSourceFiles(join(process.cwd(), "src")).filter(
      (file) => readFileSync(file, "utf8").includes(PLACEHOLDER),
    );

    expect(offenders).toEqual([]);
  });

  it("renders the Verified badge for a mainnet deployment wired to the published id", async () => {
    const publishedMainnetId =
      "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB";

    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SLA_CONTRACT_ID_MAINNET", publishedMainnetId);

    const { SLAContractIdCard } = await import("@/features/settings/stellar");

    render(<SLAContractIdCard contractId={publishedMainnetId} network="mainnet" />);

    expect(screen.getByText("Verified")).toBeInTheDocument();
  });

  it("treats an unconfigured canonical id as unverifiable instead of guessing", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SLA_CONTRACT_ID_MAINNET", "");

    const { resolveCanonicalSlaContractId } = await import("@/lib/config/env");

    expect(resolveCanonicalSlaContractId("mainnet")).toBeUndefined();
    expect(resolveCanonicalSlaContractId("unknown-net")).toBeUndefined();
  });
});
