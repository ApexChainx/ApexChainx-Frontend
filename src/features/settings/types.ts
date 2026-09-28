/** ApexChain Network Operations Intelligence Platform */
/**
 * Shared types for the settings feature modules (Issue #615).
 *
 * The settings page was split from a single 1400-line component into feature
 * modules under `src/features/settings/`. These types are shared between the
 * session and wallet modules.
 */

export type AuthUser = {
  id: string;
  email: string;
  full_name?: string | null;
  role: string;
  stellar_wallet?: string | null;
  created_at: string;
};

export type AuthSessionResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: AuthUser;
};

export type Wallet = {
  user_id: string;
  public_key: string;
  created_at: string;
  last_updated: string;
  funded: boolean;
  active: boolean;
  trustline_ready: boolean;
  message?: string;
};

export type WalletStatus = {
  user_id: string;
  public_key: string;
  funded: boolean;
  trustline_ready: boolean;
  usable: boolean;
  active: boolean;
  last_updated: string;
};

export type WalletBalance = {
  address: string;
  balances: Record<
    string,
    {
      balance: string;
      asset_type: string;
      asset_code?: string;
      asset_issuer?: string;
    }
  >;
  last_updated: string;
};
