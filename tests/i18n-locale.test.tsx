/** ApexChain Frontend Test Suite */
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it } from "vitest";

import { formatDate, formatNumber } from "@/i18n/format";
import { I18nProvider, useI18n } from "@/i18n/i18n";

/** A small harness that surfaces locale, formatDate, and formatNumber. */
function LocaleHarness() {
  const { locale, setLocale, formatDate, formatNumber } = useI18n();
  return (
    <div>
      <span data-testid="lang">{locale}</span>
      <span data-testid="date">{formatDate("2026-01-01T00:00:00Z")}</span>
      <span data-testid="datetime">
        {formatDate("2026-01-01T12:30:00Z", { dateStyle: "medium", timeStyle: "short" })}
      </span>
      <span data-testid="num">{formatNumber(1234.5)}</span>
      <button onClick={() => setLocale("pt")}>set pt</button>
      <button onClick={() => setLocale("en")}>set en</button>
    </div>
  );
}

describe("i18n locale-aware formatting", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = "";
  });

  it("syncs the <html lang> attribute with the selected locale", () => {
    render(
      <I18nProvider>
        <LocaleHarness />
      </I18nProvider>,
    );
    // The provider defaults to the default locale on mount.
    expect(document.documentElement.lang).toBe("en");

    fireEvent.click(screen.getByText("set pt"));
    expect(document.documentElement.lang).toBe("pt");

    fireEvent.click(screen.getByText("set en"));
    expect(document.documentElement.lang).toBe("en");
  });

  it("renders a pt date and number per pt conventions after a locale switch", () => {
    render(
      <I18nProvider>
        <LocaleHarness />
      </I18nProvider>,
    );
    // English defaults first.
    expect(screen.getByTestId("date").textContent).toBe("1/1/2026");
    expect(screen.getByTestId("num").textContent).toBe("1,234.5");

    fireEvent.click(screen.getByText("set pt"));
    // pt uses dd/mm/yyyy and comma as the decimal separator.
    expect(screen.getByTestId("date").textContent).toBe("01/01/2026");
    expect(screen.getByTestId("num").textContent).toBe("1.234,5");
  });

  it("keeps the datetime style when a dateStyle/timeStyle option is passed", () => {
    render(
      <I18nProvider>
        <LocaleHarness />
      </I18nProvider>,
    );
    expect(screen.getByTestId("datetime").textContent).toBeTruthy();
    expect(screen.getByTestId("datetime").textContent).not.toBe("");
  });
});

describe("i18n format helpers", () => {
  it("falls back to an empty string for invalid or empty dates", () => {
    expect(formatDate(null, "pt")).toBe("");
    expect(formatDate(undefined, "pt")).toBe("");
    expect(formatDate("", "pt")).toBe("");
    expect(formatDate("not-a-date", "pt")).toBe("");
  });

  it("falls back to 0 for non-finite numbers", () => {
    expect(formatNumber(NaN, "pt")).toBe("0");
    expect(formatNumber(Infinity, "pt")).toBe("0");
  });

  it("falls back to en formatting for a locale Intl cannot resolve", () => {
    // "zz-ZZ" is not a real locale; the helper must not throw and should
    // fall back to the en conventions.
    expect(formatDate("2026-01-01T00:00:00Z", "zz-ZZ")).toBe("1/1/2026");
    expect(formatNumber(1234.5, "zz-ZZ")).toBe("1,234.5");
  });
});
