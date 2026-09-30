/** ApexChain - Network Operations Intelligence Platform */

import { bytesToHex } from "@/lib/encoding";

/**
 * Read a cookie value by name.
 * Only works for non-HttpOnly cookies (like the CSRF token).
 */
export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;

  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${name}=`));

  if (!match) return null;

  // Take everything after the first `=`, so values that themselves contain
  // separators (base64 padding, `a=b`) survive intact.
  const rawValue = match.slice(name.length + 1);

  try {
    return decodeURIComponent(rawValue);
  } catch {
    // A malformed percent-escape (e.g. a trailing `%`, `%zz`) throws a
    // URIError. `getCookie` runs inside the request interceptor, so a single
    // bad cookie must not take down every subsequent request — fall back to
    // the raw value instead of throwing.
    return rawValue;
  }
}

/**
 * Generate a cryptographically random CSRF token.
 * Used when no server-provided token exists.
 */
export function generateCsrfToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return bytesToHex(array);
}
