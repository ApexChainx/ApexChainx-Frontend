/** ApexChain Network Operations Intelligence Platform */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import { I18nProvider, useI18n } from "@/i18n/i18n";
import en from "@/i18n/messages/en.json";
import es from "@/i18n/messages/es.json";
import pt from "@/i18n/messages/pt.json";

function collectKeys(obj: Record<string, unknown>, prefix = ""): Set<string> {
  const keys = new Set<string>();
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "object" && v !== null) {
      collectKeys(v as Record<string, unknown>, path).forEach((child) => keys.add(child));
    } else {
      keys.add(path);
    }
  }
  return keys;
}

const wrapper = ({ children }: { children: ReactNode }) => <I18nProvider>{children}</I18nProvider>;

describe("i18n locale key parity", () => {
  const enKeys = collectKeys(en as Record<string, unknown>);
  const esKeys = collectKeys(es as Record<string, unknown>);
  const ptKeys = collectKeys(pt as Record<string, unknown>);

  it("es.json covers every key in en.json", () => {
    const missing = [...enKeys].filter((k) => !esKeys.has(k));
    expect(missing).toEqual([]);
  });

  it("pt.json covers every key in en.json", () => {
    const missing = [...enKeys].filter((k) => !ptKeys.has(k));
    expect(missing).toEqual([]);
  });
});

describe("i18n missing-key dev warnings", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the translated string for an existing key", () => {
    const { result } = renderHook(() => useI18n(), { wrapper });
    expect(result.current.t("common.save")).toBe("Save");
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("falls back to the raw key on a miss", () => {
    const { result } = renderHook(() => useI18n(), { wrapper });
    expect(result.current.t("navigation.systemHealth")).toBe("System Health");
    expect(result.current.t("navigation.doesNotExist")).toBe("navigation.doesNotExist");
  });

  it("warns in development when a key is missing", () => {
    const { result } = renderHook(() => useI18n(), { wrapper });
    act(() => {
      result.current.t("navigation.nope");
    });
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('[i18n] Missing translation for key "navigation.nope"'),
    );
  });

  it("does not warn for an existing key", () => {
    const { result } = renderHook(() => useI18n(), { wrapper });
    act(() => {
      result.current.t("payments.title");
    });
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("warns when a key resolves to a non-string value", () => {
    const { result } = renderHook(() => useI18n(), { wrapper });
    act(() => {
      result.current.t("payments"); // parent object node, not a string
    });
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('[i18n] Key "payments" in locale "en" does not resolve to a string'),
    );
    // the parent node itself must not leak as a raw key render
    expect(result.current.t("payments")).toBe("payments");
  });
});