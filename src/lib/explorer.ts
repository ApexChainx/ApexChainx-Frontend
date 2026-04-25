const NETWORK = (process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "testnet") as "mainnet" | "testnet";

const BASE: Record<typeof NETWORK, string> = {
  mainnet: "https://stellar.expert/explorer/public",
  testnet: "https://stellar.expert/explorer/testnet",
};

export function explorerLink(type: "account" | "tx", value: string | null | undefined): string | null {
  if (!value || value.trim() === "") return null;
  const base = BASE[NETWORK] ?? BASE.testnet;
  return `${base}/${type}/${value}`;
}

export const STELLAR_NETWORK = NETWORK;
