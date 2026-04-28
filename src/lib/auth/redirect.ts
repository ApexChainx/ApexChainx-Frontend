const REDIRECT_KEY = "redirectTo";
const SAFE_DEFAULT = "/dashboard"; // change if needed

export function getSafeDefault() {
  return SAFE_DEFAULT;
}

export function isSafeRedirect(path: string) {
  try {
    // Prevent external redirects
    if (!path.startsWith("/")) return false;

    // Prevent auth loops
    if (path.startsWith("/login") || path.startsWith("/register")) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function sanitizeRedirect(path?: string | null) {
  if (!path) return getSafeDefault();
  return isSafeRedirect(path) ? path : getSafeDefault();
}

export { REDIRECT_KEY };