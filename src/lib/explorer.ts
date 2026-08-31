/** ApexChain - Network Operations Intelligence Platform */
import { env } from "@/lib/config/env";

export type StellarNetwork = "mainnet" | "testnet";

const BASE: Record<StellarNetwork, string> = {
  mainnet: "https://stellar.expert/explorer/public",
  testnet: "https://stellar.expert/explorer/testnet",
};

const NETWORK: StellarNetwork =
  env.STELLAR_NETWORK === "mainnet" ? "mainnet" : "testnet";

export function explorerLink(type: "account" | "tx", value: string | null | undefined): string | null {
  if (!value || value.trim() === "") return null;
  const base = BASE[NETWORK] ?? BASE.testnet;
  return `${base}/${type}/${value}`;
}

export const STELLAR_NETWORK = NETWORK;
