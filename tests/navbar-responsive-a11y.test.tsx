/**
 * ApexChain Frontend Test Suite — NavBar (#792 responsive layout, #793 a11y)
 *
 * The i18n message bundles are corrupted in this checkout, so the provider is
 * mocked: `t` echoes the key, which keeps the assertions about wiring and
 * markup independent of the (unavailable) translations.
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

const health = vi.hoisted(() => ({
  status: "green" as "green" | "red",
  isOffline: false,
}));

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

import Navigation from "@/components/Navigation";

beforeEach(() => {
  session.state = "authenticated";
  session.user = { id: "u1", email: "operator@apexchain.com", role: "admin" };
  session.logout.mockReset();
  health.status = "green";
  health.isOffline = false;
});

afterEach(cleanup);

describe("NavBar responsive layout (#792)", () => {
  it("renders a responsive, wrapping nav without inline layout styles", () => {
    render(<Navigation />);

    const nav = screen.getByRole("navigation");
    // The old fixed inline padding/border is gone in favour of Tailwind.
    expect(nav.getAttribute("style")).toBeNull();
    expect(nav.className).toMatch(/flex-wrap/);
    expect(nav.className).toMatch(/sm:px-6/);
    expect(nav.className).toMatch(/gap-y-2/);
  });

  it("keeps every navigation link reachable and wraps link groups", () => {
    render(<Navigation />);

    const links = screen.getAllByRole("link");
    // Dashboard, outages, bulk import, payments, settings, retry queue,
    // config + webhooks (admin) and the sign-in/out area.
    expect(links.length).toBeGreaterThanOrEqual(7);

    const linkGroup = screen.getByText("common.dashboard").closest("div");
    expect(linkGroup?.className).toMatch(/flex-wrap/);
    expect(linkGroup?.className).toMatch(/min-w-0/);
  });

  it("truncates a long operator email instead of forcing horizontal overflow", () => {
    session.user = {
      id: "u1",
      email: "a-very-long-operator-address@apexchain.example.com",
      role: "admin",
    };
    render(<Navigation />);

    const email = screen.getByText(session.user.email);
    expect(email.className).toMatch(/truncate/);
    expect(email.getAttribute("title")).toBe(session.user.email);
  });
});

describe("NavBar accessibility (#793)", () => {
  it("labels the navigation landmark and exposes the health badge to AT", () => {
    render(<Navigation />);

    expect(screen.getByRole("navigation")).toHaveAttribute(
      "aria-label",
      "navigation.primary",
    );
    expect(
      screen.getByRole("img", { name: "navigation.systemHealth: green" }),
    ).toBeInTheDocument();
  });

  it("marks decorative separators as aria-hidden", () => {
    render(<Navigation />);

    const separators = Array.from(
      document.querySelectorAll('nav [aria-hidden="true"]'),
    ).filter((el) => el.textContent === "|");

    expect(separators.length).toBeGreaterThan(0);
    separators.forEach((separator) => {
      expect(separator).toHaveAttribute("aria-hidden", "true");
    });
  });

  it("announces the offline banner as a polite status region", () => {
    health.isOffline = true;
    render(<Navigation />);

    const banner = screen.getByRole("status");
    expect(banner).toHaveTextContent("errors.offline");
    expect(banner).toHaveAttribute("aria-live", "polite");
  });

  it("gives interactive elements a visible focus style", () => {
    render(<Navigation />);

    const signOut = screen.getByRole("button", { name: "common.signOut" });
    expect(signOut.className).toMatch(/focus-visible:outline/);

    const linkGroup = screen.getByText("common.dashboard").closest("div");
    expect(linkGroup?.className).toMatch(/\[&_a\]:focus-visible:outline/);
  });
});
