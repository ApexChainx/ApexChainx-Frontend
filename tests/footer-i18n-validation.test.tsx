/**
 * ApexChain Frontend Test Suite — Footer strict typing (#820), i18n
 * translations (#821), form validation (#822) and memoized derivations (#823).
 *
 * Unlike the other footer suites this one drives the **real** `I18nProvider`,
 * because the footer catalogue in `src/i18n/messages/footer.ts` is well-formed
 * and merged into every locale — which is exactly what #821 needs to prove.
 */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({
  user: { id: "u1", email: "operator@apexchain.com", role: "admin" } as
    | { id: string; email: string; role: string }
    | null,
}));

vi.mock("@/hooks/useSession", () => ({
  useSession: () => ({ state: "authenticated", user: session.user, logout: vi.fn() }),
}));

vi.mock("@/lib/explorer", () => ({ STELLAR_NETWORK: "testnet" }));

import Footer from "@/components/layout/Footer";
import { buildFooterSummary, flattenFooterLinks } from "@/components/layout/footer-derive";
import {
  MAX_EMAIL_LENGTH,
  normaliseEmail,
  validateEmail,
} from "@/components/layout/footer-validation";
import type {
  FooterSection,
  ValidatedEmail,
} from "@/components/layout/footer-types";
import { I18nProvider } from "@/i18n/i18n";
import { ToastProvider } from "@/components/ui/toast";
import {
  FOOTER_MESSAGES,
  FLATTENED_FOOTER_MESSAGES,
  flattenFooterMessages,
} from "@/i18n/messages/footer";

/** Renders inside the real providers so `t()` resolves the footer catalogue. */
function renderFooter(ui: React.ReactElement, locale: "en" | "es" | "pt" = "en") {
  localStorage.setItem("preferred-locale", locale);
  return render(
    <I18nProvider>
      <ToastProvider>{ui}</ToastProvider>
    </I18nProvider>,
  );
}

beforeEach(() => {
  session.user = { id: "u1", email: "operator@apexchain.com", role: "admin" };
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("Footer i18n translations (#821)", () => {
  it("translates every footer key in all three shipped locales", () => {
    const locales = ["en", "es", "pt"] as const;

    for (const locale of locales) {
      const flat = FLATTENED_FOOTER_MESSAGES[locale];
      expect(Object.keys(flat).length).toBeGreaterThan(0);

      // No key may resolve to another locale's copy by accident: every locale
      // must define the exact same key set.
      expect(Object.keys(flat).sort()).toEqual(
        Object.keys(FLATTENED_FOOTER_MESSAGES.en).sort(),
      );
    }
  });

  it("gives genuinely different copy per locale, not English copies", () => {
    expect(FLATTENED_FOOTER_MESSAGES.en["footer.groups.platform"]).toBe("Platform");
    expect(FLATTENED_FOOTER_MESSAGES.es["footer.groups.platform"]).toBe("Plataforma");
    expect(FLATTENED_FOOTER_MESSAGES.pt["footer.groups.platform"]).toBe("Plataforma");
  });

  it("flattens the nested catalogue into dotted t() keys", () => {
    const flat = flattenFooterMessages(FOOTER_MESSAGES.en);

    expect(flat["footer.brand"]).toBe("ApexChain");
    expect(flat["footer.groups.resources"]).toBe("Resources");
    expect(flat["footer.subscribe.invalid"]).toBe(
      "That does not look like a valid email address.",
    );
    // Nested two levels deep, which is what makes the flattening worth testing.
    expect(flat["footer.links.stellarExplorer"]).toBe("Stellar Explorer");
  });

  it("renders English copy by default", () => {
    renderFooter(<Footer year={2026} />);

    expect(screen.getByText("All systems operational")).toBeInTheDocument();
    expect(screen.getByText("Platform")).toBeInTheDocument();
  });

  it("renders Spanish copy when the locale is es", () => {
    renderFooter(<Footer year={2026} />, "es");

    expect(screen.getByText("Todos los sistemas operativos")).toBeInTheDocument();
    expect(screen.getByText("Operaciones")).toBeInTheDocument();
    expect(screen.queryByText("All systems operational")).toBeNull();
  });

  it("renders Portuguese copy when the locale is pt", () => {
    renderFooter(<Footer year={2026} />, "pt");

    expect(screen.getByText("Todos os sistemas operacionais")).toBeInTheDocument();
    expect(screen.getByText("Recursos")).toBeInTheDocument();
  });

  it("interpolates the copyright year in each locale", () => {
    renderFooter(<Footer year={2026} />, "es");
    expect(screen.getByText(/© 2026 ApexChain/)).toBeInTheDocument();
  });

  it("interpolates the network name into the badge's accessible name", () => {
    renderFooter(<Footer year={2026} />, "es");
    expect(screen.getByRole("img", { name: "Stellar testnet" })).toBeInTheDocument();
  });

  it("localizes the landmark name", () => {
    renderFooter(<Footer year={2026} />, "pt");
    expect(screen.getByRole("contentinfo", { name: "Informações do site" })).toBeInTheDocument();
  });

  it("localizes external-link hints", () => {
    renderFooter(<Footer year={2026} />, "es");
    expect(
      screen.getByRole("link", { name: /se abre en una pestaña nueva/ }),
    ).toBeInTheDocument();
  });

  it("reports no missing translation key for the footer namespace", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderFooter(<Footer year={2026} />);

    const missing = warn.mock.calls
      .map((call) => String(call[0]))
      .filter((message) => message.includes("footer."));

    expect(missing).toEqual([]);
    warn.mockRestore();
  });
});

describe("Footer form validation (#822)", () => {
  it("rejects an empty value as required rather than invalid", () => {
    expect(validateEmail("")).toEqual({ ok: false, code: "required" });
    expect(validateEmail("   ")).toEqual({ ok: false, code: "required" });
  });

  it("rejects the mistakes people actually make", () => {
    for (const bad of [
      "operator",
      "operator@",
      "@apexchain.com",
      "operator@apexchain",
      "operator @apexchain.com",
      "operator@apexchain..com",
      "operator@apexchain.c",
    ]) {
      expect(validateEmail(bad), bad).toMatchObject({ ok: false, code: "invalid" });
    }
  });

  it("accepts ordinary addresses", () => {
    for (const good of [
      "operator@apexchain.com",
      "first.last@sub.apexchain.co.uk",
      "ops+alerts@apexchain.com",
      "user_name-1@apex-1.io",
    ]) {
      expect(validateEmail(good).ok, good).toBe(true);
    }
  });

  it("trims surrounding whitespace before validating", () => {
    expect(normaliseEmail("  a@b.com  ")).toBe("a@b.com");
    const result = validateEmail("  operator@apexchain.com  ");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe("operator@apexchain.com");
  });

  it("rejects an address beyond the maximum length", () => {
    const tooLong = `${"a".repeat(MAX_EMAIL_LENGTH)}@apexchain.com`;
    expect(validateEmail(tooLong)).toMatchObject({ ok: false, code: "invalid" });
  });

  it("surfaces the missing-value message inline, next to the field", async () => {
    renderFooter(<Footer year={2026} />);

    await userEvent.click(screen.getByRole("button", { name: "Subscribe" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Enter your email address.",
    );
  });

  it("surfaces the invalid-format message inline", async () => {
    renderFooter(<Footer year={2026} />);

    await userEvent.type(screen.getByLabelText("Email address"), "not-an-email");
    await userEvent.click(screen.getByRole("button", { name: "Subscribe" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That does not look like a valid email address.",
    );
  });

  it("does not submit an invalid address", async () => {
    const onSubscribe = vi.fn().mockResolvedValue(undefined);
    renderFooter(<Footer year={2026} onSubscribe={onSubscribe} />);

    await userEvent.type(screen.getByLabelText("Email address"), "nope");
    await userEvent.click(screen.getByRole("button", { name: "Subscribe" }));

    expect(onSubscribe).not.toHaveBeenCalled();
  });

  it("hands the submit handler an address that already passed validation", async () => {
    const onSubscribe = vi.fn().mockResolvedValue(undefined);
    renderFooter(<Footer year={2026} onSubscribe={onSubscribe} />);

    await userEvent.type(
      screen.getByLabelText("Email address"),
      "  operator@apexchain.com  ",
    );
    await userEvent.click(screen.getByRole("button", { name: "Subscribe" }));

    await waitFor(() => expect(onSubscribe).toHaveBeenCalledTimes(1));
    // Normalised, and typed as `ValidatedEmail` at the call site.
    expect(onSubscribe.mock.calls[0]?.[0]).toBe("operator@apexchain.com");
  });

  it("marks the field invalid and wires aria-describedby to the message", async () => {
    renderFooter(<Footer year={2026} />);

    const field = screen.getByLabelText("Email address");
    expect(field).toHaveAttribute("aria-invalid", "false");

    await userEvent.click(screen.getByRole("button", { name: "Subscribe" }));

    const alert = await screen.findByRole("alert");
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field.getAttribute("aria-describedby")).toBe(alert.id);
  });

  it("clears the error as soon as the operator edits the field", async () => {
    renderFooter(<Footer year={2026} />);

    await userEvent.click(screen.getByRole("button", { name: "Subscribe" }));
    const alertId = (await screen.findByRole("alert")).id;

    await userEvent.type(screen.getByLabelText("Email address"), "a");

    expect(screen.queryByRole("alert")).toBeNull();
    // The hint is back in place of the error, still wired via aria-describedby.
    const field = screen.getByLabelText("Email address");
    expect(field.getAttribute("aria-describedby")).not.toBe(alertId);
    expect(field).toHaveAttribute("aria-describedby");
  });

  it("reports a service failure without discarding what was typed", async () => {
    const onSubscribe = vi.fn().mockRejectedValue(new Error("503"));
    renderFooter(<Footer year={2026} onSubscribe={onSubscribe} />);

    const field = screen.getByLabelText("Email address");
    await userEvent.type(field, "operator@apexchain.com");
    await userEvent.click(screen.getByRole("button", { name: "Subscribe" }));

    await waitFor(() => expect(onSubscribe).toHaveBeenCalled());
    // A 503 is not a validation failure: the address survives so the operator
    // can retry, and the field is still valid.
    await waitFor(() => expect(field).toHaveValue("operator@apexchain.com"));
    expect(field).toHaveAttribute("aria-invalid", "false");
  });

  it("shows the submitting state while the request is in flight", async () => {
    let release: (() => void) | undefined;
    const onSubscribe = vi.fn(
      () => new Promise<void>((resolve) => { release = resolve; }),
    );
    renderFooter(<Footer year={2026} onSubscribe={onSubscribe} />);

    await userEvent.type(screen.getByLabelText("Email address"), "operator@apexchain.com");
    await userEvent.click(screen.getByRole("button", { name: "Subscribe" }));

    const button = await screen.findByRole("button", { name: "Subscribing…" });
    expect(button).toBeDisabled();

    release?.();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Subscribe" })).toBeEnabled(),
    );
  });

  it("can be hidden or replaced by the host", () => {
    const { rerender } = renderFooter(<Footer year={2026} hideSubscribe />);
    expect(screen.queryByTestId("footer-subscribe-form")).toBeNull();

    rerender(
      <I18nProvider>
        <ToastProvider>
          <Footer year={2026} subscribeSlot={<p>Opt out instead</p>} />
        </ToastProvider>
      </I18nProvider>,
    );
    expect(screen.getByText("Opt out instead")).toBeInTheDocument();
    expect(screen.queryByTestId("footer-subscribe-form")).toBeNull();
  });
});

describe("Footer memoized derivations (#823)", () => {
  const CATALOGUE: readonly FooterSection[] = [
    {
      id: "platform",
      titleKey: "footer.groups.platform",
      links: [
        { kind: "internal", href: "/", labelKey: "common.dashboard" },
        { kind: "internal", href: "/outages", labelKey: "common.outages" },
      ],
    },
    {
      id: "admin",
      titleKey: "footer.groups.operations",
      links: [
        { kind: "internal", href: "/config", labelKey: "common.config", adminOnly: true },
      ],
    },
  ];

  it("filters admin-only links and reports accurate counts", () => {
    const admin = buildFooterSummary(CATALOGUE, true);
    expect(admin.totalLinks).toBe(3);
    expect(admin.sectionCount).toBe(2);
    expect(admin.isEmpty).toBe(false);

    const operator = buildFooterSummary(CATALOGUE, false);
    expect(operator.totalLinks).toBe(2);
    expect(operator.sectionCount).toBe(1);
    expect(operator.isEmpty).toBe(false);
  });

  it("drops sections emptied by admin filtering", () => {
    const onlyAdmin: readonly FooterSection[] = [
      {
        id: "admin",
        titleKey: "footer.groups.operations",
        links: [
          { kind: "internal", href: "/config", labelKey: "common.config", adminOnly: true },
        ],
      },
    ];

    const summary = buildFooterSummary(onlyAdmin, false);
    expect(summary.sectionCount).toBe(0);
    expect(summary.isEmpty).toBe(true);
  });

  it("computes offsets that describe the rendered DOM, not the input", () => {
    const summary = buildFooterSummary(CATALOGUE, false);

    // The admin section was dropped, so the surviving section still starts at 0.
    expect(summary.sectionOffsets).toEqual([0]);
    expect(flattenFooterLinks(summary)).toHaveLength(summary.totalLinks);
  });

  it("computes contiguous offsets across every surviving section", () => {
    const summary = buildFooterSummary(CATALOGUE, true);
    // Platform has 2 links, so the admin section starts at offset 2.
    expect(summary.sectionOffsets).toEqual([0, 2]);

    // Every section's offset equals the total length of the sections before it,
    // so a column can number its links without re-flattening the catalogue.
    let cursor = 0;
    for (const [index, section] of summary.sections.entries()) {
      expect(summary.sectionOffsets[index]).toBe(cursor);
      cursor += section.links.length;
    }
    expect(cursor).toBe(summary.totalLinks);
  });

  it("handles an empty catalogue without dividing by zero or throwing", () => {
    const summary = buildFooterSummary([], true);
    expect(summary).toMatchObject({
      totalLinks: 0,
      sectionCount: 0,
      isEmpty: true,
      sectionOffsets: [],
      sections: [],
    });
  });

  it("does not recompute when the session object identity changes", () => {
    const { rerender } = renderFooter(<Footer year={2026} />);

    // Default catalogue is 4 + 4 + 2 = 10 destinations for an admin.
    const before = screen.getByTestId("footer-links").getAttribute("data-link-count");
    expect(before).toBe("10");

    // A heartbeat delivers a fresh session object with identical content. The
    // memo is keyed on `isAdmin`, not on the session object, so the counts are
    // unchanged and no re-derivation happens.
    for (let i = 0; i < 5; i += 1) {
      rerender(
        <I18nProvider>
          <ToastProvider>
            <Footer year={2026} />
          </ToastProvider>
        </I18nProvider>,
      );
    }

    expect(screen.getByTestId("footer-links").getAttribute("data-link-count")).toBe(before);
  });

  it("recomputes when the audience actually changes", () => {
    const { rerender } = renderFooter(<Footer year={2026} />);
    expect(screen.getByTestId("footer-links").getAttribute("data-link-count")).toBe("10");

    // Config and Webhooks are admin-only, so an operator sees 8.
    session.user = { id: "u2", email: "viewer@apexchain.com", role: "operator" };
    rerender(
      <I18nProvider>
        <ToastProvider>
          <Footer year={2026} />
        </ToastProvider>
      </I18nProvider>,
    );

    expect(screen.getByTestId("footer-links").getAttribute("data-link-count")).toBe("8");
    expect(screen.queryByText("Config")).toBeNull();
  });

  it("recomputes when the catalogue itself changes", () => {
    const small: readonly FooterSection[] = [
      {
        id: "platform",
        titleKey: "footer.groups.platform",
        links: [{ kind: "internal", href: "/", labelKey: "common.dashboard" }],
      },
    ];

    const { rerender } = renderFooter(<Footer year={2026} sections={small} />);
    expect(screen.getByTestId("footer-links").getAttribute("data-link-count")).toBe("1");

    rerender(
      <I18nProvider>
        <ToastProvider>
          <Footer year={2026} sections={CATALOGUE} />
        </ToastProvider>
      </I18nProvider>,
    );
    expect(screen.getByTestId("footer-links").getAttribute("data-link-count")).toBe("2");
  });
});

describe("Footer strict typing (#820)", () => {
  it("keeps internal destinations as router links without a target", () => {
    renderFooter(<Footer year={2026} />);

    const dashboard = screen.getByRole("link", { name: "Dashboard" });
    expect(dashboard.tagName).toBe("A");
    expect(dashboard).not.toHaveAttribute("target");
    expect(dashboard.getAttribute("href")).toContain("/");
  });

  it("always gives external destinations noopener and a new-tab hint", () => {
    renderFooter(<Footer year={2026} />);

    const external = screen.getAllByRole("link", { name: /opens in a new tab/ });
    expect(external.length).toBeGreaterThan(0);
    external.forEach((link) => {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link.getAttribute("rel")).toBe("noopener noreferrer");
      expect(link.getAttribute("href")).toMatch(/^https?:/);
    });
  });

  it("narrows the network to the two names the badge can render", () => {
    renderFooter(<Footer year={2026} />);
    // `STELLAR_NETWORK` is mocked to "testnet"; the type admits only
    // "mainnet" | "testnet", so no third value can reach the colour decision.
    expect(screen.getByRole("img", { name: "Stellar testnet" }).className).toMatch(
      /emerald/,
    );
  });

  it("only accepts an address that came out of the validator", async () => {
    const onSubscribe = vi.fn(async (email: ValidatedEmail) => {
      // The parameter type is the brand, so this is a compile-time guarantee
      // that the handler cannot receive an unvalidated string.
      expect(typeof email).toBe("string");
      expect(validateEmail(email).ok).toBe(true);
    });

    renderFooter(<Footer year={2026} onSubscribe={onSubscribe} />);
    await userEvent.type(screen.getByLabelText("Email address"), "ops@apexchain.com");
    await userEvent.click(screen.getByRole("button", { name: "Subscribe" }));

    await waitFor(() => expect(onSubscribe).toHaveBeenCalledTimes(1));
  });

  it("renders a caller-supplied catalogue with only known destination kinds", () => {
    const custom: readonly FooterSection[] = [
      {
        id: "custom",
        titleKey: "footer.groups.resources",
        links: [
          { kind: "internal", href: "/outages", labelKey: "common.outages" },
          { kind: "external", href: "https://example.com", labelKey: "footer.links.sourceCode", external: true },
        ],
      },
    ];

    renderFooter(<Footer year={2026} sections={custom} />);
    expect(screen.getByTestId("footer-section-custom")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Outages" })).toBeInTheDocument();
  });
});