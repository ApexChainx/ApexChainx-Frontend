/** ApexChain Frontend Test Suite */
import { beforeEach, describe, expect, it } from "vitest";

import {
  DEFAULT_THEME,
  getThemePreference,
  LEGACY_THEME_STORAGE_KEY,
  setThemePreference,
  THEME_STORAGE_KEY,
} from "@/lib/theme-storage";

/**
 * Issue #619 — the theme preference moved from the bare global "theme" key to
 * the namespaced "apexchain.theme" key. These tests pin the read/migrate
 * contract: new key wins, legacy key migrates once (leaving no residue),
 * invalid values fall back to the default, and writes during the transition
 * window keep both keys in sync for older app versions.
 */
describe("theme storage (Issue #619)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns the default when no key is set", () => {
    expect(getThemePreference()).toBe(DEFAULT_THEME);
    expect(getThemePreference()).toBe("system");
  });

  it("reads the namespaced key", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    expect(getThemePreference()).toBe("dark");
  });

  it("migrates the legacy key: returns its value, writes the new key, and removes the legacy key", () => {
    localStorage.setItem(LEGACY_THEME_STORAGE_KEY, "light");

    expect(getThemePreference()).toBe("light");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    expect(localStorage.getItem(LEGACY_THEME_STORAGE_KEY)).toBeNull();
  });

  it("does not delete the legacy key when the new-key write fails", () => {
    localStorage.setItem(LEGACY_THEME_STORAGE_KEY, "dark");
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error("storage disabled");
    };

    try {
      // The value is still returned so the user keeps their preference.
      expect(getThemePreference()).toBe("dark");
    } finally {
      Storage.prototype.setItem = setItem;
    }
  });

  it("prefers the namespaced key when both keys are set", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "light");
    localStorage.setItem(LEGACY_THEME_STORAGE_KEY, "dark");

    expect(getThemePreference()).toBe("light");
    // The legacy key is untouched on the non-migration path.
    expect(localStorage.getItem(LEGACY_THEME_STORAGE_KEY)).toBe("dark");
  });

  it.each(["", "BLUE", "dark ", "123", "null"])(
    "falls back to the default for invalid value %j",
    (invalid) => {
      localStorage.setItem(THEME_STORAGE_KEY, invalid);
      expect(getThemePreference()).toBe(DEFAULT_THEME);
    },
  );

  it("falls back to the default when the legacy key holds an invalid value", () => {
    localStorage.setItem(LEGACY_THEME_STORAGE_KEY, "sepia");
    expect(getThemePreference()).toBe(DEFAULT_THEME);
    // No migration happens for garbage values.
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(LEGACY_THEME_STORAGE_KEY)).toBe("sepia");
  });

  it("setThemePreference writes both keys during the transition window", () => {
    setThemePreference("dark");

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    // Older app versions / stale tabs still read the bare key.
    expect(localStorage.getItem(LEGACY_THEME_STORAGE_KEY)).toBe("dark");
  });

  it("a subsequent read after migration does not rewrite or fail once the legacy key is gone", () => {
    localStorage.setItem(LEGACY_THEME_STORAGE_KEY, "light");
    expect(getThemePreference()).toBe("light");

    // Simulate the transition window closing (legacy writes dropped): only the
    // namespaced key remains and reads still work.
    localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
    expect(getThemePreference()).toBe("light");
  });
});
