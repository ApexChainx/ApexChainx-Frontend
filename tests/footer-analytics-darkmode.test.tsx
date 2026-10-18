/**
 * ApexChain Frontend Test Suite — Footer analytics events (#816), empty-state
 * design (#817), dark mode (#818) and reusable extraction (#819).
 *
 * The i18n message bundles are corrupted in this checkout, so the provider is
 * mocked and `t` echoes the key, which keeps the assertions about behaviour
 * and markup independent of the (unavailable) translations.
 */
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({
  user: { id: "u1", email: "operator@apexchain.com", role: "admin" } as
    | { id: string; email: string; role: string }
    | null,
}));

const analytics = vi.hoisted(() => ({
  events: [] as { event: string; properties: Record<string, unknown> }[],
  breadcrumbs: [] as { message?: string; data?: Record<string, unknown> }[],
}));

vi.mock("@/i18n/i18n", () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      key === "footer.copyright" ? `footer.copyright:${params?.year}` : key,
    locale: "en",
  }),
}));

vi.mock("@/hooks/useSession", () => ({
  useSession: () => ({ state: "authenticated", user: session.user, logout: vi.fn() }),
}));

vi.mock("@/lib/explorer", () => ({ STELLAR_NETWORK: "testnet" }));

import Footer from "@/components/layout/Footer";
import { FooterEmptyState } from "@/components/layout/FooterEmptyState";
import { FooterLinkSection } from "@/components/layout/FooterLinkSection";
import {
  FOOTER_EVENTS,
  sanitiseHref,
  setAnalyticsSink,
  trackFooterEvent,
} from "@/lib/footer-analytics";
import {
  FOOTER_SECTIONS,
  visibleFooterSections,
  type FooterSection,
} from "@/components/layout/footer-sections";

beforeEach(() => {
  session.user = { id: "u1", email: "operator@apexchain.com", role: "admin" };
  analytics.events = [];
  analytics.breadcrumbs = [];

  // Stand in for the Sentry client the app already loads.
  (globalThis as { Sentry?: unknown }).Sentry = {
    addBreadcrumb: (crumb: { message?: string; data?: Record<string, unknown> }) => {
      analytics.breadcrumbs.push(crumb);
    },
  };

  setAnalyticsSink((event, properties) => {
    analytics.events.push({ event, properties });
  });
});

afterEach(() => {
  cleanup();
  setAnalyticsSink(null);
  delete (globalThis as { Sentry?: unknown }).Sentry;
});

describe("Footer analytics events (#816)", () => {
  it("records a single view event when the footer mounts", () => {
    render(<Footer year={2026} />);

    const views = analytics.events.filter((e) => e.event === FOOTER_EVENTS.view);
    expect(views).toHaveLength(1);
    expect(views[0]?.properties.linkCount).toBeGreaterThan(0);
  });

  it("does not re-record the view on every re-render", () => {
    const { rerender } = render(<Footer year={2026} />);

    for (let i = 0; i < 5; i += 1) rerender(<Footer year={2026} />);

    expect(analytics.events.filter((e) => e.event === FOOTER_EVENTS.view)).toHaveLength(1);
  });

  it("records which link was activated, not just the column", async () => {
    render(<Footer year={2026} />);

    await userEvent.click(screen.getByRole("link", { name: "common.payments" }));

    const click = analytics.events.find((e) => e.event === FOOTER_EVENTS.linkClick);
    expect(click?.properties).toMatchObject({
      groupId: "platform",
      href: "/payments",
      labelKey: "common.payments",
      external: false,
    });
  });

  it("flags external links so they can be told apart in the data", async () => {
    render(<Footer year={2026} />);

    await userEvent.click(screen.getByRole("link", { name: /footer.links.sourceCode/ }));

    const click = analytics.events.find((e) => e.event === FOOTER_EVENTS.linkClick);
    expect(click?.properties.external).toBe(true);
    // External URLs are not recorded as routes — only the stable label is.
    expect(click?.properties.href).toBeUndefined();
    expect(click?.properties.labelKey).toBe("footer.links.sourceCode");
  });

  it("strips query strings so operator-identifying data never leaks", () => {
    expect(sanitiseHref("/outages?token=secret#timeline")).toBe("/outages");
    expect(sanitiseHref("/payments")).toBe("/payments");
    expect(sanitiseHref("https://example.com/x")).toBeUndefined();
    expect(sanitiseHref("")).toBeUndefined();
  });

  it("scrubs a query string out of a recorded click", () => {
    trackFooterEvent(FOOTER_EVENTS.linkClick, { href: "/outages?token=secret" });

    expect(analytics.events[0]?.properties.href).toBe("/outages");
  });

  it("mirrors events onto a Sentry breadcrumb for error triage", () => {
    trackFooterEvent(FOOTER_EVENTS.view, { linkCount: 9 });

    const crumb = analytics.breadcrumbs.find((c) => c.message === FOOTER_EVENTS.view);
    expect(crumb).toBeDefined();
    expect(crumb?.data).toMatchObject({ linkCount: 9 });
  });

  it("records the empty state when the catalogue is empty", () => {
    render(<Footer year={2026} sections={[]} />);

    const empty = analytics.events.find((e) => e.event === FOOTER_EVENTS.empty);
    expect(empty).toBeDefined();
    expect(empty?.properties.linkCount).toBe(0);
  });

  it("emits nothing when tracking is switched off", async () => {
    render(<Footer year={2026} trackEvents={false} />);

    await userEvent.click(screen.getByRole("link", { name: "common.dashboard" }));

    expect(analytics.events).toHaveLength(0);
  });

  it("never lets a failing sink break the surface it measures", () => {
    setAnalyticsSink(() => {
      throw new Error("analytics backend down");
    });

    // Must not throw — a broken sink is swallowed so the footer still renders.
    expect(() => trackFooterEvent(FOOTER_EVENTS.view, { linkCount: 1 })).not.toThrow();

    render(<Footer year={2026} />);
    expect(screen.getByTestId("site-footer")).toBeInTheDocument();
  });

  it("still records to Sentry when no sink is registered", () => {
    setAnalyticsSink(null);
    trackFooterEvent(FOOTER_EVENTS.view, { linkCount: 3 });

    expect(analytics.breadcrumbs.some((c) => c.message === FOOTER_EVENTS.view)).toBe(true);
  });
});

describe("Footer empty-state design (#817)", () => {
  it("renders a designed empty state instead of a blank column", () => {
    render(<Footer year={2026} sections={[]} />);

    const empty = screen.getByTestId("footer-empty-state");
    expect(empty).toHaveAttribute("role", "status");
    expect(empty).toHaveTextContent("footer.empty.title");
    expect(empty).toHaveTextContent("footer.empty.hint");
    // The link grid is gone entirely rather than rendered empty.
    expect(screen.queryByTestId("footer-links")).toBeNull();
  });

  it("still renders the brand and legal rows around the empty state", () => {
    render(<Footer year={2026} sections={[]} />);

    // An empty catalogue is a content state, not a broken component.
    expect(screen.getByTestId("footer-brand")).toBeInTheDocument();
    expect(screen.getByTestId("site-footer")).toBeInTheDocument();
    expect(screen.getByText("footer.copyright:2026")).toBeInTheDocument();
  });

  it("accepts a caller-supplied empty state", () => {
    render(
      <Footer
        year={2026}
        sections={[]}
        emptyState={<div data-testid="custom-empty">nothing configured</div>}
      />,
    );

    expect(screen.getByTestId("custom-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("footer-empty-state")).toBeNull();
  });

  it("exposes the empty state as a standalone reusable piece", () => {
    render(<FooterEmptyState message="No destinations configured" />);

    expect(screen.getByTestId("footer-empty-state")).toHaveTextContent(
      "No destinations configured",
    );
  });

  it("drops sections emptied by admin filtering rather than showing a bare heading", () => {
    const onlyAdmin: FooterSection[] = [
      {
        id: "admin",
        titleKey: "footer.groups.admin",
        links: [{ href: "/config", labelKey: "common.config", adminOnly: true }],
      },
    ];

    expect(visibleFooterSections(false, onlyAdmin)).toEqual([]);

    // Which means a non-admin operator sees the empty state rather than a
    // heading with nothing under it.
    session.user = { id: "u2", email: "viewer@apexchain.com", role: "operator" };
    render(<Footer year={2026} sections={onlyAdmin} />);

    expect(screen.getByTestId("footer-empty-state")).toBeInTheDocument();
    expect(screen.queryByText("footer.groups.admin")).toBeNull();
  });

  it("shows no empty state when there is at least one link", () => {
    render(<Footer year={2026} />);
    expect(screen.queryByTestId("footer-empty-state")).toBeNull();
  });
});

describe("Footer dark mode (#818)", () => {
  it("declares an explicit dark scheme for the footer surface", () => {
    render(<Footer year={2026} />);

    const footer = screen.getByTestId("site-footer");
    expect(footer.className).toMatch(/dark:bg-slate-900/);
    expect(footer.className).toMatch(/dark:border-slate-700/);
    expect(footer.className).toMatch(/dark:text-slate-200/);
  });

  it("declares dark variants for the brand copy", () => {
    render(<Footer year={2026} />);

    const brand = screen.getByTestId("footer-brand");
    expect(brand.innerHTML).toMatch(/dark:text-slate-50|dark:text-slate-400/);
  });

  it("gives links per-scheme colours instead of inheriting the default", () => {
    render(<Footer year={2026} />);

    const link = screen.getByRole("link", { name: "common.dashboard" });
    // Explicit for both schemes: the inherited default blue fails AA on the
    // dark footer surface.
    expect(link.className).toMatch(/text-slate-700/);
    expect(link.className).toMatch(/dark:text-slate-300/);
    expect(link.className).toMatch(/dark:focus-visible:outline-blue-400/);
  });

  it("gives the legal row per-scheme colours", () => {
    render(<Footer year={2026} />);

    const footer = screen.getByTestId("site-footer");
    expect(footer.innerHTML).toMatch(/dark:text-slate-400/);
  });

  it("gives the network badge a dark-mode variant", () => {
    render(<Footer year={2026} />);

    const badge = screen.getByRole("img", { name: /network/ });
    expect(badge.className).toMatch(/dark:bg-emerald-400/);
  });

  it("gives the empty state per-scheme colours", () => {
    render(<FooterEmptyState />);

    const empty = screen.getByTestId("footer-empty-state");
    expect(empty.className).toMatch(/dark:border-slate-700/);
    expect(empty.className).toMatch(/dark:bg-slate-800/);
  });
});

describe("Footer reusable extraction (#819)", () => {
  it("renders a link column on its own, outside the footer", () => {
    render(
      <FooterLinkSection
        section={{
          id: "custom",
          titleKey: "footer.groups.platform",
          links: [
            { href: "/outages", labelKey: "common.outages" },
            { href: "https://example.com", labelKey: "footer.links.stellarExplorer", external: true },
          ],
        }}
      />,
    );

    expect(screen.getByTestId("footer-section-custom")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "common.outages" })).toBeInTheDocument();
    // Reused outside the shell, so it carries no footer chrome of its own.
    expect(screen.queryByTestId("site-footer")).toBeNull();
  });

  it("keeps analytics wiring when a column is reused elsewhere", async () => {
    render(
      <FooterLinkSection
        section={{
          id: "custom",
          titleKey: "footer.groups.platform",
          links: [{ href: "/outages", labelKey: "common.outages" }],
        }}
      />,
    );

    await userEvent.click(screen.getByRole("link", { name: "common.outages" }));

    expect(analytics.events.find((e) => e.event === FOOTER_EVENTS.linkClick)?.properties).toMatchObject({
      groupId: "custom",
      href: "/outages",
    });
  });

  it("accepts a caller-supplied catalogue", () => {
    render(
      <Footer
        year={2026}
        sections={[
          {
            id: "docs",
            titleKey: "footer.groups.resources",
            links: [{ href: "/outages", labelKey: "common.outages" }],
          },
        ]}
      />,
    );

    expect(screen.getByTestId("footer-section-docs")).toBeInTheDocument();
    expect(screen.queryByTestId("footer-section-platform")).toBeNull();
  });

  it("keeps the default catalogue available as a single source of truth", () => {
    expect(FOOTER_SECTIONS.length).toBeGreaterThan(0);
    FOOTER_SECTIONS.forEach((section) => {
      expect(section.links.length).toBeGreaterThan(0);
    });
  });

  it("still applies admin filtering to a caller-supplied catalogue", () => {
    session.user = { id: "u2", email: "viewer@apexchain.com", role: "operator" };
    render(<Footer year={2026} />);

    expect(screen.queryByText("common.config")).toBeNull();
    expect(screen.getByText("common.settings")).toBeInTheDocument();
  });
});