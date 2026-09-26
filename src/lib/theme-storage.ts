/** ApexChain - Theme preference persistence (Issue #619) */

/**
 * Issue #619 — the theme preference used to live under the bare global key
 * "theme", which collides with any third-party snippet or embed sharing the
 * origin (other app-local keys are namespaced, e.g. "noc_session_seen").
 * It now lives under the namespaced "apexchain.theme" key.
 */

/** Namespaced storage key for the current theme preference. */
export const THEME_STORAGE_KEY = "apexchain.theme";

/** Legacy bare key written by app versions before Issue #619. */
export const LEGACY_THEME_STORAGE_KEY = "theme";

export type ThemePreference = "light" | "dark" | "system";

/** Used when no stored preference exists or the stored value is invalid. */
export const DEFAULT_THEME: ThemePreference = "system";

const THEME_PREFERENCES: readonly ThemePreference[] = ["light", "dark", "system"];

function isThemePreference(value: string): value is ThemePreference {
  return (THEME_PREFERENCES as readonly string[]).includes(value);
}

function readStoredTheme(key: string): ThemePreference | null {
  try {
    const stored = localStorage.getItem(key);
    if (stored && isThemePreference(stored)) {
      return stored;
    }
  } catch {
    // localStorage can throw in privacy-restricted contexts; treat as unset.
  }
  return null;
}

/**
 * Read the theme preference: the namespaced key first, falling back to the
 * legacy "theme" key once for migration. After a successful legacy read the
 * value is written to the new key and the legacy key is removed, so no
 * legacy residue is left behind.
 */
export function getThemePreference(): ThemePreference {
  const current = readStoredTheme(THEME_STORAGE_KEY);
  if (current) {
    return current;
  }

  const legacy = readStoredTheme(LEGACY_THEME_STORAGE_KEY);
  if (legacy) {
    // Migrate: persist under the namespaced key and drop the legacy key.
    try {
      localStorage.setItem(THEME_STORAGE_KEY, legacy);
    } catch {
      // Keep the legacy value readable if the new write fails.
      return legacy;
    }
    try {
      localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
    } catch {
      // Best effort — the legacy key is harmless if removal fails.
    }
    return legacy;
  }

  return DEFAULT_THEME;
}

/**
 * Persist the theme preference. During the transition window both the
 * namespaced and the legacy key are written so older app versions (or tabs
 * still running the pre-#619 bundle) keep observing the preference. Legacy
 * writes can be dropped once the transition window closes — the read path
 * already migrates and removes the legacy key.
 */
export function setThemePreference(value: ThemePreference): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, value);
    localStorage.setItem(LEGACY_THEME_STORAGE_KEY, value);
  } catch {
    // localStorage can throw in privacy-restricted contexts; the in-memory
    // theme state still applies for the session.
  }
}
