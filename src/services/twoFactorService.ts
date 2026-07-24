/** ApexChain - Network Operations Intelligence Platform */
import { api } from "@/lib/api";

export interface TwoFactorSetupResponse {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

/**
 * Initiate 2FA setup - returns TOTP secret and QR code URL.
 */
export async function setupTwoFactor(): Promise<TwoFactorSetupResponse> {
  const response = await api.post<TwoFactorSetupResponse>("/auth/2fa/setup");
  return response.data;
}

/**
 * Verify a TOTP code to complete 2FA setup.
 */
export async function verifyTwoFactor(code: string): Promise<{ success: boolean }> {
  const response = await api.post<{ success: boolean }>("/auth/2fa/verify", { code });
  return response.data;
}

/**
 * Disable 2FA for the current user.
 */
export async function disableTwoFactor(code: string): Promise<{ success: boolean }> {
  const response = await api.post<{ success: boolean }>("/auth/2fa/disable", { code });
  return response.data;
}

/**
 * Regenerate backup codes.
 */
export async function regenerateBackupCodes(code: string): Promise<{ backupCodes: string[] }> {
  const response = await api.post<{ backupCodes: string[] }>("/auth/2fa/backup-codes", { code });
  return response.data;
}
