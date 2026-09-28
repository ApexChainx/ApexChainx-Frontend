"use client";
/** ApexChain Network Operations Intelligence Platform */
/**
 * Settings stellar module (Issue #615).
 *
 * Owns the Stellar network health check (Issue #128 — Horizon reachability +
 * latency polling) and composes it into the network-status card, plus the SLA
 * contract id card (Issue #129). The health check result is shared through
 * `StellarHealthProvider` so the wallet module can gate its action buttons on
 * Horizon reachability without starting a second polling loop.
 */
import { createContext, useContext } from "react";
import type { ReactNode } from "react";

import { useStellarHealth } from "@/hooks/useStellarHealth";
import type { StellarHealthState } from "@/hooks/useStellarHealth";

// ─── Context ─────────────────────────────────────────────────────────────────
interface StellarHealthContextValue extends StellarHealthState {
  isHorizonUnreachable: boolean;
}

const StellarHealthContext = createContext<StellarHealthContextValue | null>(null);

export function useStellarHealthSettings(): StellarHealthContextValue {
  const ctx = useContext(StellarHealthContext);
  if (!ctx) {
    throw new Error("useStellarHealthSettings must be used within StellarHealthProvider");
  }
  return ctx;
}

export function StellarHealthProvider({ children }: { children: ReactNode }) {
  const health = useStellarHealth();
  const isHorizonUnreachable = health.status === "unreachable";

  const value: StellarHealthContextValue = { ...health, isHorizonUnreachable };

  return (
    <StellarHealthContext.Provider value={value}>
      {children}
    </StellarHealthContext.Provider>
  );
}

// ─── Stellar Network Health Card (Issue #128) ────────────────────────────────
export function StellarHealthCard({ network }: { network: string }) {
  const { status: horizonStatus, latencyMs } = useStellarHealthSettings();

  const isReachable = horizonStatus === "reachable";
  const isChecking = horizonStatus === "checking";

  const statusIcon = isChecking ? (
    <div className="h-3 w-3 animate-pulse rounded-full bg-amber-400" />
  ) : isReachable ? (
    <div className="h-3 w-3 rounded-full bg-emerald-500" />
  ) : (
    <div className="h-3 w-3 rounded-full bg-red-500" />
  );

  const statusLabel = isChecking
    ? "Checking..."
    : isReachable
    ? "Reachable"
    : "Unreachable";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Stellar Network Status
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Horizon endpoint health check for the {network} network
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          {statusIcon}
          {statusLabel}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Latency
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {isChecking
              ? "—"
              : latencyMs !== null
              ? `${latencyMs} ms`
              : "N/A"}
          </p>
        </div>
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Network
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900 capitalize">
            {network}
          </p>
        </div>
      </div>

      {!isReachable && !isChecking && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="font-medium">Horizon is unreachable</p>
          <p className="mt-1 text-red-700">
            Stellar network actions (wallet creation, payments) are currently
            unavailable. Please check your network connection or the Horizon
            endpoint configuration.
          </p>
        </div>
      )}
    </section>
  );
}

// ─── SLA Contract ID Card (Issue #129) ───────────────────────────────────────
/** Canonical SLA contract IDs published for each network */
const CANONICAL_SLA_CONTRACT_IDS: Record<string, string> = {
  testnet: "CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC",
  // TODO: replace the placeholder below with the actual published mainnet
  //       contract ID from the DOCS.md once it is confirmed.
  mainnet: "PLACEHOLDER_MAINNET_CONTRACT_ID_CHANGE_ME",
};

export function SLAContractIdCard({
  contractId,
  network,
}: {
  contractId?: string | undefined;
  network: string;
}) {
  const canonicalId = CANONICAL_SLA_CONTRACT_IDS[network];
  const isConfigured = Boolean(contractId?.trim());
  const isMismatch =
    isConfigured && Boolean(canonicalId) && contractId !== canonicalId;
  const isVerified = isConfigured && !isMismatch && Boolean(canonicalId);

  const truncatedId =
    contractId && contractId.length > 10
      ? `${contractId.slice(0, 6)}...${contractId.slice(-4)}`
      : contractId ?? "";

  const canonicalTruncated =
    canonicalId && canonicalId.length > 10
      ? `${canonicalId.slice(0, 6)}...${canonicalId.slice(-4)}`
      : canonicalId ?? "";

  const sectionTone = isMismatch
    ? "border-red-200 bg-red-50"
    : isConfigured
    ? "border-slate-200 bg-white"
    : "border-amber-200 bg-amber-50";

  return (
    <section className={`rounded-2xl border p-6 shadow-sm ${sectionTone}`}>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            SLA Contract ID
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Resolved smart contract identifier used for SLA calculation calls
          </p>
        </div>
        {isVerified && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Verified
          </span>
        )}
        {isMismatch && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Mismatch
          </span>
        )}
        {!isConfigured && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11v4m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18zm-1 4h2v6h-2z" />
            </svg>
            Not configured
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Resolved Contract ID
          </p>
          <p className="mt-1 font-mono text-sm font-semibold text-slate-900">
            {isConfigured ? truncatedId : "Not configured"}
          </p>
        </div>
        {isConfigured && canonicalId && (
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Expected ({network})
            </p>
            <p className="mt-1 font-mono text-sm font-semibold text-slate-900">
              {canonicalTruncated}
            </p>
          </div>
        )}
      </div>

      {!isConfigured && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-medium">Contract not configured</p>
          <p className="mt-1">
            No SLA contract is configured for this deployment. Set the
            NEXT_PUBLIC_SLA_CONTRACT_ID environment variable to display the real
            contract address on this card.
          </p>
        </div>
      )}

      {isMismatch && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="font-medium">Contract ID Mismatch</p>
          <p className="mt-1 text-red-600">
            The configured SLA contract ID does not match the canonical published
            contract ID for the {network} network. Double-check your
            NEXT_PUBLIC_SLA_CONTRACT_ID environment variable to ensure it points
            to the correct contract.
          </p>
        </div>
      )}
    </section>
  );
}

// ─── Composed module ─────────────────────────────────────────────────────────
export default function StellarSettings({
  contractId,
  network,
}: {
  contractId?: string;
  network: string;
}) {
  return (
    <StellarHealthProvider>
      <StellarHealthCard network={network} />
      <SLAContractIdCard contractId={contractId} network={network} />
    </StellarHealthProvider>
  );
}