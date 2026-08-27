/** ApexChain Network Operations Intelligence Platform */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import { I18nProvider, useI18n } from "@/i18n/i18n";

const wrapper = ({ children }: { children: ReactNode }) => <I18nProvider>{children}</I18nProvider>;

describe("i18n interpolation", () => {
  it("substitutes {name} placeholders from params", () => {
    const { result } = renderHook(() => useI18n(), { wrapper });
    expect(result.current.t("errors.exportFailed", { format: "CSV" })).toBe(
      "Failed to export as CSV. Please try again.",
    );
  });

  it("substitutes multiple distinct placeholders", () => {
    const { result } = renderHook(() => useI18n(), { wrapper });
    expect(
      result.current.t("errors.exportFailed", { format: "JSON" }),
    ).toBe("Failed to export as JSON. Please try again.");
  });

  it("leaves unresolved placeholders in place when a param is omitted", () => {
    const { result } = renderHook(() => useI18n(), { wrapper });
    // No params → {format} stays literally, matching the "no params" contract.
    expect(result.current.t("errors.exportFailed")).toBe(
      "Failed to export as {format}. Please try again.",
    );
  });

  it("falls back to the raw key on a miss even with params", () => {
    const { result } = renderHook(() => useI18n(), { wrapper });
    expect(result.current.t("navigation.doesNotExist", { x: 1 })).toBe("navigation.doesNotExist");
  });
});

describe("i18n plural selection", () => {
  const render = () => renderHook(() => useI18n(), { wrapper });

  it("selects the one form for count === 1", () => {
    const { result } = render();
    expect(result.current.t("outages.confirmResolve", { count: 1 })).toBe(
      "Confirm to resolve 1 selected outage.",
    );
  });

  it("selects the other form for count === 0", () => {
    const { result } = render();
    expect(result.current.t("outages.confirmResolve", { count: 0 })).toBe(
      "Confirm to resolve 0 selected outages.",
    );
  });

  it("selects the other form for count > 1", () => {
    const { result } = render();
    expect(result.current.t("outages.confirmResolve", { count: 3 })).toBe(
      "Confirm to resolve 3 selected outages.",
    );
  });

  it("falls back to the raw key when the message node is not a plural shape", () => {
    const { result } = render();
    // `payments` is a plain string node; passing a count must not break lookup.
    expect(result.current.t("outages.title", { count: 2 })).toBe("Outages");
  });
});

describe("i18n locale switching with interpolation", () => {
  it("resolves plural forms in es after switching locale", () => {
    const { result } = renderHook(() => useI18n(), { wrapper });
    act(() => {
      result.current.setLocale("es");
    });
    expect(result.current.t("outages.confirmResolve", { count: 1 })).toBe(
      "Confirma resolver 1 interrupción seleccionada.",
    );
    expect(result.current.t("outages.confirmResolve", { count: 4 })).toBe(
      "Confirma resolver 4 interrupciones seleccionadas.",
    );
  });

  it("resolves plural forms in pt after switching locale", () => {
    const { result } = renderHook(() => useI18n(), { wrapper });
    act(() => {
      result.current.setLocale("pt");
    });
    expect(result.current.t("outages.confirmResolve", { count: 1 })).toBe(
      "Confirme resolver 1 interrupção selecionada.",
    );
    expect(result.current.t("outages.confirmResolve", { count: 7 })).toBe(
      "Confirme resolver 7 interrupções selecionadas.",
    );
  });
});