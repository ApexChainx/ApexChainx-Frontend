/**
 * ApexChain Frontend Test Suite — NavBar unit + keyboard navigation coverage
 * (#796 unit tests, #799 keyboard navigation).
 *
 * The i18n bundles in this checkout are corrupted binary data, so the provider
 * is mocked (`t` echoes the key) and the assertions target structure/wiring.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({
  state: "authenticated" as "loading" | "authenticated" | "unauthenticated",
  user: { id: "u1", email: "operator@apexchain.com", role: "admin" } as
    | { id: string; email: string; role: string }
    | null,
  logout: vi.fn(() => Promise.resolve({ serverRevoked: true })),
}));

const health = vi.hoisted(() => ({
  status: "green" as "green" | "red",
  isOffline: false,
}));

const nav = vi.hoisted(() => ({ pathname: "/" as string }));

vi.mock("@/i18n/i18n", () => ({
  useI18n: () => ({ t: (key: string) => key, locale: "en" }),
}));

vi.mock("@/hooks/useSession", () => ({
  useSession: () => ({
    state: session.state,
    user: session.user,
    logout: session.logout,
  }),
}));

vi.mock("@/hooks/useHealth", () => ({
  useHealth: () => ({ status: health.status, isOffline: health.isOffline }),
}));

vi.mock("@/lib/explorer", () => ({ STELLAR_NETWORK: "mainnet" }));

vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }));

import Navigation from "@/components/Navigation";

beforeEach(() => {
  session.state = "authenticated";
  session.user = { id: "u1", email: "operator@apexchain.com", role: "admin" };
  session.logout.mockClear();
  health.status = "green";
  health.isOffline = false;
  nav.pathname = "/";
});

afterEach(cleanup);

describe("NavBar unit behaviour (#796)", () => {
  it("renders the public navigation links with their routes", () => {
    render(<Navigation />);

    const expected: Array<[string, string]> = [
      ["common.dashboard", "/"],
      ["common.outages", "/outages"],
      ["common.bulkImport", "/bulk-import"],
      ["common.payments", "/payments"],
      ["common.settings", "/setting"],
    ];

    for (const [label, href] of expected) {
      expect(screen.getByRole("link", { name: label })).toHaveAttribute(
        "href",
        href,
      );
    }

    // The retry queue is still hard-coded English (tracked separately by #805).
    expect(screen.getByRole("link", { name: "Retry Queue" })).toHaveAttribute(
      "href",
      "/payments/retry-queue",
    );
  });

  it("hides admin-only routes from non-admin operators", () => {
    session.user = { id: "u1", email: "operator@apexchain.com", role: "user" };
    render(<Navigation />);

    expect(screen.queryByRole("link", { name: "common.config" })).toBeNull();
    expect(screen.queryByRole("link", { name: "common.webhooks" })).toBeNull();
  });

  it("shows admin-only routes to admins", () => {
    render(<Navigation />);

    expect(screen.getByRole("link", { name: "common.config" })).toHaveAttribute(
      "href",
      "/config",
    );
    expect(
      screen.getByRole("link", { name: "common.webhooks" }),
    ).toHaveAttribute("href", "/webhooks");
  });

  it("renders the mainnet badge when the network is mainnet", () => {
    render(<Navigation />);
    expect(screen.getByText("MAINNET")).toBeInTheDocument();
  });

  it("shows a loading placeholder while the session bootstraps", () => {
    session.state = "loading";
    session.user = null;
    render(<Navigation />);

    expect(screen.getByText("settings.loadingSession")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "common.signOut" })).toBeNull();
  });

  it("shows the signed-in operator and calls logout on click", () => {
    render(<Navigation />);

    expect(screen.getByText("operator@apexchain.com")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "common.signOut" }));
    expect(session.logout).toHaveBeenCalledTimes(1);
  });

  it("offers a sign-in link when unauthenticated", () => {
    session.state = "unauthenticated";
    session.user = null;
    render(<Navigation />);

    expect(screen.getByRole("link", { name: "auth.signIn" })).toHaveAttribute(
      "href",
      "/login",
    );
  });
});

describe("NavBar keyboard navigation (#799)", () => {
  it("renders a skip-to-content link as the first focusable element", () => {
    render(<Navigation />);

    const skipLink = screen.getByRole("link", { name: "common.skipToContent" });
    expect(skipLink).toHaveAttribute("href", "#main-content");
    expect(skipLink.className).toMatch(/sr-only/);
    expect(skipLink.className).toMatch(/focus:not-sr-only/);

    // It must be the first focusable element so a single Tab reaches it.
    const focusable = Array.from(
      document.querySelectorAll<HTMLElement>("a[href], button, [tabindex]"),
    );
    expect(focusable[0]).toBe(skipLink);
  });

  it("marks the current route with aria-current for assistive tech", () => {
    nav.pathname = "/payments";
    render(<Navigation />);

    expect(screen.getByRole("link", { name: "common.payments" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("link", { name: "common.dashboard" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("does not mark the dashboard current on a nested route", () => {
    nav.pathname = "/outages";
    render(<Navigation />);

    expect(
      screen.getByRole("link", { name: "common.dashboard" }),
    ).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "common.outages" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("gives every navigation link a visible focus affordance", () => {
    render(<Navigation />);

    const linkGroup = screen.getByText("common.dashboard").closest("div");
    expect(linkGroup?.className).toMatch(/\[&_a\]:focus-visible:outline/);
  });

  it("keeps the sign-out control keyboard reachable", () => {
    render(<Navigation />);

    const signOut = screen.getByRole("button", { name: "common.signOut" });
    expect(signOut.tagName).toBe("BUTTON");
    expect(signOut.className).toMatch(/focus-visible:outline/);
  });
});
