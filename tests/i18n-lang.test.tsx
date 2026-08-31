/** ApexChain Network Operations Intelligence Platform */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { I18nProvider, useI18n } from "@/i18n/i18n";
import { formatDate, formatNumber } from "@/i18n/format";

function LocaleProbe() {
  const { locale } = useI18n();
  return <span>{locale}</span>;
}

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("lang");
});

describe("html lang attribute", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("sets the document lang to the active locale on mount", () => {
    localStorage.setItem("preferred-locale", "es");
    render(
      <I18nProvider>
        <LocaleProbe />
      </I18nProvider>,
    );

    expect(document.documentElement.lang).toBe("es");
  });

  it("defaults the document lang to the default locale when none is saved", () => {
    render(
      <I18nProvider>
        <LocaleProbe />
      </I18nProvider>,
    );

    expect(document.documentElement.lang).toBe("en");
  });
});

describe("locale-aware formatters", () => {
  it("formats numbers with locale decimal separator", () => {
    // pt uses a comma as the decimal separator, unlike en-US.
    expect(formatNumber(1234.5, "pt")).toContain(",");
    expect(formatNumber(1234.5, "en")).toContain(".");
  });

  it("formats dates for the active locale", () => {
    const date = new Date("2024-01-15T12:30:00Z");
    expect(formatDate(date, "en")).toContain("2024");
  });
});
