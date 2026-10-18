/**
 * ApexChain Frontend Test Suite — Footer unit tests (Issue #812).
 *
 * Unit level: the pure link-catalogue logic, the roving-tabindex key resolver,
 * and each presentational piece of the footer rendered in isolation.
 *
 * The i18n message bundles are corrupted in this checkout, so the provider is
 * mocked — `t` echoes the key, which keeps the assertions about logic and
 * markup independent of the (unavailable) translations.
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({
  user: { id: "u1", email: "operator@apexchain.com", role: "admin" } as
    | { id: string; email: string; role: string }
    | null,
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
import {
  FOOTER_LINK_GROUPS,
  flattenFooterLinks,
  nextFooterLinkIndex,
  visibleFooterGroups,
  visibleFooterLinks,
  type FooterLinkGroup,
} from "@/components/layout/footer-links";

beforeEach(() => {
  session.user = { id: "u1", email: "operator@apexchain.com", role: "admin" };
});

afterEach(cleanup);

describe("footer link catalogue", () => {
  it("declares every group with a unique id", () => {
    const ids = FOOTER_LINK_GROUPS.map((group) => group.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every link an href and a translation key", () => {
    for (const link of flattenFooterLinks(FOOTER_LINK_GROUPS)) {
      expect(link.href).toBeTruthy();
      expect(link.labelKey).toMatch(/^[a-z]+\.[A-Za-z0-9]+$/);
    }
  });

  it("marks every external link so it can get a noopener rel", () => {
    for (const link of flattenFooterLinks(FOOTER_LINK_GROUPS)) {
      if (link.href.startsWith("http")) expect(link.external).toBe(true);
    }
  });

  it("hides admin-only links from non-admin operators", () => {
    const adminLinks = visibleFooterLinks(
      FOOTER_LINK_GROUPS[1]?.links ?? [],
      true,
    ).map((l) => l.href);
    const operatorLinks = visibleFooterLinks(
      FOOTER_LINK_GROUPS[1]?.links ?? [],
      false,
    ).map((l) => l.href);

    expect(adminLinks).toContain("/config");
    expect(operatorLinks).not.toContain("/config");
    expect(operatorLinks).toContain("/setting");
  });

  it("drops groups that become empty after admin filtering", () => {
    const onlyAdmin: FooterLinkGroup[] = [
      { id: "admin", titleKey: "footer.groups.admin", links: [{ href: "/config", labelKey: "common.config", adminOnly: true }] },
    ];

    expect(visibleFooterGroups(false, onlyAdmin)).toEqual([]);
    expect(visibleFooterGroups(true, onlyAdmin)).toHaveLength(1);
  });

  it("flattens groups into DOM order for the keyboard handler", () => {
    const flat = flattenFooterLinks(FOOTER_LINK_GROUPS);
    expect(flat[0]?.href).toBe("/");
    expect(flat).toHaveLength(FOOTER_LINK_GROUPS.reduce((n, g) => n + g.links.length, 0));
  });
});

describe("nextFooterLinkIndex (#815)", () => {
  it("advances with ArrowRight and ArrowDown", () => {
    expect(nextFooterLinkIndex(0, "ArrowRight", 5)).toBe(1);
    expect(nextFooterLinkIndex(0, "ArrowDown", 5)).toBe(1);
  });

  it("goes back with ArrowLeft and ArrowUp", () => {
    expect(nextFooterLinkIndex(3, "ArrowLeft", 5)).toBe(2);
    expect(nextFooterLinkIndex(3, "ArrowUp", 5)).toBe(2);
  });

  it("wraps in both directions instead of dead-ending", () => {
    expect(nextFooterLinkIndex(4, "ArrowRight", 5)).toBe(0);
    expect(nextFooterLinkIndex(0, "ArrowLeft", 5)).toBe(4);
  });

  it("jumps to the ends with Home and End", () => {
    expect(nextFooterLinkIndex(3, "Home", 5)).toBe(0);
    expect(nextFooterLinkIndex(3, "End", 5)).toBe(4);
  });

  it("leaves every other key to the browser", () => {
    // Tab must escape the region, so it is never hijacked.
    expect(nextFooterLinkIndex(1, "Tab", 5)).toBeNull();
    expect(nextFooterLinkIndex(1, "Enter", 5)).toBeNull();
    expect(nextFooterLinkIndex(1, "a", 5)).toBeNull();
  });

  it("is inert when there are no links", () => {
    expect(nextFooterLinkIndex(0, "ArrowRight", 0)).toBeNull();
    expect(nextFooterLinkIndex(0, "Home", 0)).toBeNull();
  });
});

describe("Footer rendering", () => {
  it("renders a named contentinfo landmark", () => {
    render(<Footer year={2026} />);
    expect(screen.getByRole("contentinfo")).toHaveAttribute("aria-label", "footer.landmark");
  });

  it("renders one labelled navigation region for the link columns", () => {
    render(<Footer year={2026} />);
    expect(screen.getByRole("navigation", { name: "footer.groups.platform" })).toBeInTheDocument();
  });

  it("renders a heading for every visible column", () => {
    render(<Footer year={2026} />);
    expect(screen.getByText("footer.groups.platform")).toBeInTheDocument();
    expect(screen.getByText("footer.groups.operations")).toBeInTheDocument();
    expect(screen.getByText("footer.groups.resources")).toBeInTheDocument();
  });

  it("gives external links noopener and a new-tab hint", () => {
    render(<Footer year={2026} />);

    const external = screen.getByRole("link", { name: /footer.links.sourceCode/ });
    expect(external).toHaveAttribute("target", "_blank");
    expect(external).toHaveAttribute("rel", "noopener noreferrer");
    expect(external).toHaveTextContent("footer.opensInNewTab");
  });

  it("keeps internal links in the same tab", () => {
    render(<Footer year={2026} />);
    expect(screen.getByRole("link", { name: "common.dashboard" })).not.toHaveAttribute("target");
  });

  it("exposes the network badge as a labelled image", () => {
    render(<Footer year={2026} />);
    expect(screen.getByRole("img", { name: /network/ })).toBeInTheDocument();
  });

  it("interpolates the copyright year", () => {
    render(<Footer year={2031} />);
    expect(screen.getByText("footer.copyright:2031")).toBeInTheDocument();
  });

  it("hides admin columns from non-admin operators", () => {
    session.user = { id: "u2", email: "viewer@apexchain.com", role: "operator" };
    render(<Footer year={2026} />);

    expect(screen.queryByText("common.config")).toBeNull();
    expect(screen.queryByText("common.webhooks")).toBeNull();
  });
});