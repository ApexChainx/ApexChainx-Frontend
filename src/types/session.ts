/** ApexChain Network Operations Intelligence Platform */

export interface SessionUser {
  id: string;
  email: string;
  role: string;
  full_name?: string | null;
  stellar_wallet?: string | null;
  created_at?: string;
}
