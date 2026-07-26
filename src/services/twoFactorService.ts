/** ApexChain - Network Operations Intelligence Platform */
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export interface TwoFactorSetupResponse {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

/**
 * Initiate 2FA setup - returns TOTP secret and QR code URL.
 */
export async function setupTwoFactor(): Promise<TwoFactorSetupResponse> {
  const response = await api.post<TwoFactorSetupResponse>(ENDPOINTS.auth.twoFactorSetup);
  return response.data;
}

/**
 * Verify a TOTP code to complete 2FA setup.
 */
export async function verifyTwoFactor(code: string): Promise<{ success: boolean }> {
  const response = await api.post<{ success: boolean }>(ENDPOINTS.auth.twoFactorVerify, { code });
  return response.data;
}

/**
 * Disable 2FA for the current user.
 */
export async function disableTwoFactor(code: string): Promise<{ success: boolean }> {
  const response = await api.post<{ success: boolean }>(ENDPOINTS.auth.twoFactorDisable, { code });
  return response.data;
}

/**
 * Regenerate backup codes.
 */
export async function regenerateBackupCodes(code: string): Promise<{ backupCodes: string[] }> {
  const response = await api.post<{ backupCodes: string[] }>(ENDPOINTS.auth.twoFactorBackupCodes, { code });
  return response.data;
}
