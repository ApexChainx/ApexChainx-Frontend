/** ApexChain - Network Operations Intelligence Platform */
"use client";

import { useMutation } from "@tanstack/react-query";
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
 *
 * Session state lives in React context (`src/providers/session.tsx`), not in a
 * React Query cache — there is no `["session"]` query key to invalidate.
 */
export function useTwoFactorVerify() {
  return useMutation({
    mutationFn: verifyTwoFactor,
  });
}

/**
 * Disable 2FA.
 *
 * Session state lives in React context (`src/providers/session.tsx`), not in a
 * React Query cache — there is no `["session"]` query key to invalidate.
 */
export function useTwoFactorDisable() {
  return useMutation({
    mutationFn: disableTwoFactor,
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