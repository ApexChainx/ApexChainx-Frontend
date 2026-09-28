/** ApexChain Frontend Test Suite */
/**
 * Issue #615 — language module tests (src/features/settings/language.tsx).
 *
 * Covers the language-selector behaviour that used to live inline in the
 * settings page: the trigger shows the current locale name, and switching
 * locale persists the choice (localStorage + cookie via the i18n provider) and
 * syncs the document language.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { I18nProvider } from "@/i18n/i18n";
import LanguageSettings from "@/features/settings/language";

function renderLanguage() {
  return render(
    <I18nProvider>
      <LanguageSettings />
    </I18nProvider>
  );
}

describe("LanguageSettings", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = "en";
  });

  it("shows the current locale name in the dropdown trigger", () => {
    renderLanguage();

    expect(screen.getByRole("button", { name: /english/i })).toBeInTheDocument();
  });

  it("lists every supported locale in the dropdown", () => {
    renderLanguage();

    fireEvent.click(screen.getByRole("button", { name: /english/i }));

    expect(screen.getByText("English")).toBeInTheDocument();
    expect(screen.getByText("Español")).toBeInTheDocument();
    expect(screen.getByText("Português")).toBeInTheDocument();
  });

  it("switches locale, persists it, and syncs the document language", () => {
    renderLanguage();

    fireEvent.click(screen.getByRole("button", { name: /english/i }));
    fireEvent.click(screen.getByText("Español"));

    expect(localStorage.getItem("preferred-locale")).toBe("es");
    expect(document.documentElement.lang).toBe("es");
    // The trigger reflects the new current locale.
    expect(screen.getByRole("button", { name: /español/i })).toBeInTheDocument();
  });

  it("restores the persisted locale on remount", () => {
    localStorage.setItem("preferred-locale", "pt");
    renderLanguage();

    expect(screen.getByRole("button", { name: /português/i })).toBeInTheDocument();
  });
});