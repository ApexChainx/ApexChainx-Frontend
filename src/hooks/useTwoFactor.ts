/** ApexChain - Network Operations Intelligence Platform */
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sessionKeys } from "@/lib/query-keys";
import {
  setupTwoFactor,
  verifyTwoFactor,
  disableTwoFactor,
  regenerateBackupCodes,
} from "@/services/twoFactorService";

/**
 * Get 2FA setup data (secret + QR code).
 */
export function useTwoFactorSetup() {
  return useMutation({
    mutationFn: setupTwoFactor,
  });
}

/**
 * Verify a TOTP code during setup.
 */
export function useTwoFactorVerify() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: verifyTwoFactor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.all });
    },
  });
}

/**
 * Disable 2FA.
 */
export function useTwoFactorDisable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: disableTwoFactor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.all });
    },
  });
}

/**
 * Regenerate backup codes.
 */
export function useRegenerateBackupCodes() {
  return useMutation({
    mutationFn: regenerateBackupCodes,
  });
}
