/**
 * ApexChain Frontend Test Suite — reusable NavLinks + empty state
 * (#803 extract into a reusable component, #801 empty-state design).
 *
 * The real i18n bundles are corrupted binary data in this checkout, so the
 * provider is mocked (`t` echoes the key).
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({
  state: "authenticated" as "loading" | "authenticated" | "unauthenticated",
  user: { id: "u1", email: "operator@apexchain.com", role: "admin" } as
    | { id: string; email: string; role: string }
    | null,
  logout: vi.fn(),
}));

const health = vi.hoisted(() => ({ status: "green" as "green" | "red", isOffline: false }));
const t = vi.hoisted(() => vi.fn((key: string) => key));

vi.mock("@/i18n/i18n", () => ({ useI18n: () => ({ t, locale: "en" }) }));
vi.mock("@/hooks/useSession", () => ({
  useSession: () => ({ state: session.state, user: session.user, logout: session.logout }),
}));
vi.mock("@/hooks/useHealth", () => ({
  useHealth: () => ({ status: health.status, isOffline: health.isOffline }),
}));
vi.mock("@/lib/explorer", () => ({ STELLAR_NETWORK: "mainnet" }));

import { NavLinks, NAV_LINKS, visibleNavLinks } from "@/components/shell/nav-links";
import Navigation, { ADMIN_ROUTES } from "@/components/Navigation";

beforeEach(() => {
  t.mockClear();
});

afterEach(cleanup);

describe("NavLinks reusable component (#803)", () => {
  it("exposes the navigation destinations as reusable data", () => {
    const hrefs = NAV_LINKS.map((link) => link.href);
    expect(hrefs).toContain("/");
    expect(hrefs).toContain("/outages");
    expect(hrefs).toContain("/payments/retry-queue");
    // Every entry is described by a translation key.
    NAV_LINKS.forEach((link) => expect(link.labelKey).toBeTruthy());
  });

  it("filters admin-only destinations for non-admins", () => {
    expect(visibleNavLinks(false).map((l) => l.href)).not.toContain("/config");
    expect(visibleNavLinks(true).map((l) => l.href)).toContain("/config");
  });

  it("renders every visible link with its href, translated label and tour hook", () => {
    render(<NavLinks isAdmin />);

    expect(screen.getByRole("link", { name: "common.dashboard" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "common.dashboard" })).toHaveAttribute(
      "data-tour",
      "nav-dashboard",
    );
    expect(screen.getByRole("link", { name: "common.config" })).toHaveAttribute("href", "/config");
    expect(screen.getByRole("link", { name: "common.webhooks" })).toHaveAttribute(
      "href",
      "/webhooks",
    );
  });

  it("hides admin destinations from non-admin operators", () => {
    render(<NavLinks isAdmin={false} />);

    expect(screen.queryByRole("link", { name: "common.config" })).toBeNull();
    expect(screen.queryByRole("link", { name: "common.webhooks" })).toBeNull();
    expect(screen.getByRole("link", { name: "common.dashboard" })).toBeInTheDocument();
  });

  it("accepts a caller-supplied link list (reusability)", () => {
    render(
      <NavLinks
        links={[{ href: "/custom", labelKey: "common.custom" }]}
      />,
    );

    expect(screen.getByRole("link", { name: "common.custom" })).toHaveAttribute("href", "/custom");
    // The default destinations are not rendered when a list is supplied.
    expect(screen.queryByRole("link", { name: "common.dashboard" })).toBeNull();
  });
});

describe("NavLinks empty state (#801)", () => {
  it("renders a designed empty state when there is nothing to show", () => {
    render(<NavLinks links={[]} />);

    const empty = screen.getByTestId("nav-empty-state");
    expect(empty).toHaveAttribute("role", "status");
    expect(empty).toHaveTextContent("navigation.emptyState");
    expect(t).toHaveBeenCalledWith("navigation.emptyState");
  });

  it("shows the empty state when a non-admin has only admin links", () => {
    render(
      <NavLinks
        isAdmin={false}
        links={[{ href: "/config", labelKey: "common.config", adminOnly: true }]}
      />,
    );

    expect(screen.getByTestId("nav-empty-state")).toBeInTheDocument();
  });
});

describe("Navigation composition (#803)", () => {
  it("renders the extracted NavLinks inside the bar", () => {
    render(<Navigation />);

    expect(screen.getByRole("link", { name: "common.dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "common.webhooks" })).toBeInTheDocument();
  });

  it("derives ADMIN_ROUTES from the reusable link data", () => {
    expect(ADMIN_ROUTES).toEqual(["/config", "/webhooks"]);
    expect(ADMIN_ROUTES.every((href) => NAV_LINKS.some((l) => l.href === href))).toBe(true);
  });
});
