const DEFAULT_API_BASE = "http://localhost:8000/api/v1";

const DEFAULT_STELLAR_HORIZON = "https://horizon-testnet.stellar.org";
const DEFAULT_SLA_CONTRACT_ID = "CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC";
const DEFAULT_STELLAR_NETWORK = "testnet";

export const env = {
  API_BASE_URL:
    process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE,

  API_REFRESH_URL: (() => {
    const base = (
      process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE
    ).replace(/\/$/, "");
    return `${base}/auth/refresh`;
  })(),

  /** Horizon RPC endpoint for Stellar network queries */
  STELLAR_HORIZON_URL:
    process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL || DEFAULT_STELLAR_HORIZON,

  /** The Stellar network identifier (testnet | mainnet) */
  STELLAR_NETWORK:
    (process.env.NEXT_PUBLIC_STELLAR_NETWORK as string) || DEFAULT_STELLAR_NETWORK,

  /** SLA Calculator contract ID displayed on the wallet card for audit */
  SLA_CONTRACT_ID:
    process.env.NEXT_PUBLIC_SLA_CONTRACT_ID || DEFAULT_SLA_CONTRACT_ID,

  /** USDC token address used for payment escrow */
  USDC_TOKEN_ADDRESS:
    process.env.NEXT_PUBLIC_USDC_TOKEN_ADDRESS || "",

  /** APEX token address */
  APEX_TOKEN_ADDRESS:
    process.env.NEXT_PUBLIC_APEX_TOKEN_ADDRESS || "",
};