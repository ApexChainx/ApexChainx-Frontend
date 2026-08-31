/** ApexChain Network Operations Intelligence Platform */
import { renderHook } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";

import { I18nProvider, useI18n } from "@/i18n/i18n";

function renderT(locale: "en" | "es" | "pt") {
  localStorage.setItem("preferred-locale", locale);
  const { result } = renderHook(() => useI18n(), {
    wrapper: ({ children }) => <I18nProvider>{children}</I18nProvider>,
  });
  return result.current.t;
}

describe("i18n t() interpolation and plurals", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("resolves a static key without params", () => {
    const t = renderT("en");
    expect(t("navigation.systemHealth")).toBe("System Health");
  });

  it("substitutes {placeholder} parameters", () => {
    const t = renderT("en");
    expect(t("bulk.greeting", { name: "Ada" })).toBe("Hello, Ada");
  });

  it("leaves unknown placeholders intact when no param is provided", () => {
    const t = renderT("en");
    expect(t("bulk.greeting")).toBe("Hello, {name}");
  });

  it("selects the singular plural form for count === 1", () => {
    const t = renderT("en");
    expect(t("bulk.selectedCount", { count: 1 })).toBe("1 outage selected");
  });

  it("selects the plural form for count !== 1", () => {
    const t = renderT("en");
    expect(t("bulk.selectedCount", { count: 3 })).toBe("3 outages selected");
    expect(t("bulk.selectedCount", { count: 0 })).toBe("0 outages selected");
  });

  it("selects the es plural form", () => {
    const t = renderT("es");
    expect(t("bulk.selectedCount", { count: 1 })).toBe("1 incidente seleccionado");
    expect(t("bulk.selectedCount", { count: 5 })).toBe("5 incidentes seleccionados");
  });

  it("returns the raw key for a missing message", () => {
    const t = renderT("en");
    expect(t("does.not.exist")).toBe("does.not.exist");
  });
});
