/** ApexChain - Network Operations Intelligence Platform */

/**
 * Blocked hostnames for SSRF prevention.
 */
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "metadata.google.internal",
  "169.254.169.254",
]);

/**
 * Blocked private IP ranges (RFC 1918 + link-local).
 */
const PRIVATE_IP_PATTERNS = [
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^fc00:/i,
  /^fe80:/i,
  /^0\./,
];

/**
 * Validate a URL to prevent SSRF attacks.
 * Rejects private IPs, localhost, and metadata endpoints.
 *
 * @returns { valid: boolean; reason?: string }
 */
export function validateUrl(url: string): { valid: boolean; reason?: string } {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, reason: "Invalid URL format" };
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { valid: false, reason: "Only HTTP(S) URLs are allowed" };
  }

  const hostname = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { valid: false, reason: "Requests to localhost/internal addresses are not allowed" };
  }

  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      return { valid: false, reason: "Requests to private/internal networks are not allowed" };
    }
  }

  return { valid: true };
}
