/** ApexChain - Network Operations Intelligence Platform */

/**
 * Generate a cryptographically secure webhook secret.
 */
export function generateWebhookSecret(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Verify a webhook signature using HMAC-SHA256.
 * Compares using constant-time comparison to prevent timing attacks.
 */
export async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );

  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time comparison
  if (expectedSignature.length !== signature.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < expectedSignature.length; i++) {
    result |= expectedSignature.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Mask a webhook secret for display (show first 8 and last 4 chars).
 */
export function maskSecret(secret: string): string {
  if (secret.length <= 12) return "•".repeat(secret.length);
  return `${secret.slice(0, 8)}${"•".repeat(secret.length - 12)}${secret.slice(-4)}`;
}
