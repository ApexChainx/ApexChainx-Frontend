const REDIRECT_KEY = "redirectTo";

/**
 * Fallback for unsafe/absent redirect targets.
 * Must be a real route: the dashboard lives at `/` (see src/app/page.tsx
 * and the dashboard link in src/components/Navigation.tsx). Tests pin
 * this value to the app's route table so route renames cannot silently
 * break redirect defaults again (see tests/redirect.test.ts).
 */
const SAFE_DEFAULT = "/";

/**
 * Control characters (C0 controls + DEL), including their percent-encoded
 * forms (%00–%1F, %7F). These can smuggle CRLF/Location headers into the
 * navigation target or break out of the intended path.
 */
const CONTROL_CHARS = /[\u0000-\u001f\u007f]|%(?:0[0-9a-f]|1[0-9a-f]|7f)/i;

/**
 * Scheme prefixes that would take the browser off-origin if a value were
 * parsed leniently. Defense in depth — the leading-"/" requirement below
 * already rejects these.
 */
const SCHEME_PATTERN = /^(?:javascript|data|vbscript|file|blob|about|mailto):/i;

export function getSafeDefault() {
  return SAFE_DEFAULT;
}

/**
 * True only for same-origin, relative-path redirect targets.
 *
 * Rejects:
 *  - absolute URLs and scheme payloads (https://…, javascript:…, data:…)
 *  - protocol-relative URLs (//host/path)
 *  - backslash variants (/\host), which URL parsers normalize to //host
 *  - control characters and their percent-encoded forms (%0d, %0a, …)
 *  - auth-loop targets (/login, /register)
 *
 * SSR-safe: the origin used for the structural check comes from the app
 * config, not the DOM.
 */
export function isSafeRedirect(path: string) {
  if (typeof path !== "string" || path.length === 0) return false;

  // Must be a same-origin relative path: exactly one leading slash.
  if (!path.startsWith("/") || path.startsWith("//")) return false;

  // Backslashes are normalized to "/" by URL parsers for special schemes,
  // so "/\evil.example" would resolve like "//evil.example".
  if (path.includes("\\")) return false;
    // Prevent protocol-relative external redirects (e.g. "//evil.example.com"):
    // browsers resolve these against another origin.
    if (path.startsWith("//")) return false;

    // Prevent auth loops
    if (path.startsWith("/login") || path.startsWith("/register")) {
      return false;
    }

  // Reject literal and percent-encoded control characters.
  if (CONTROL_CHARS.test(path)) return false;

  // Reject scheme payloads explicitly (defense in depth).
  if (SCHEME_PATTERN.test(path)) return false;

  // Prevent auth loops.
  if (path.startsWith("/login") || path.startsWith("/register")) return false;

  // Structural check: the value must resolve to a URL on our own origin.
  try {
    const origin = new URL(
      typeof window === "undefined"
        ? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
        : window.location.origin,
    ).origin;
    const parsed = new URL(path, origin);
    return parsed.origin === origin;
  } catch {
    return false;
  }
}

export function sanitizeRedirect(path?: string | null) {
  if (!path) return getSafeDefault();
  return isSafeRedirect(path) ? path : getSafeDefault();
}

export { REDIRECT_KEY };
