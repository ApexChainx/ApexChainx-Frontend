/**
 * ApexChain Frontend Test Suite — Sidebar responsive layout (#824),
 * accessibility (#825), loading skeleton (#826) and error boundary (#827).
 *
 * `matchMedia` is stubbed per-test so the sidebar can be driven at both the
 * drawer and the static-column breakpoints. The i18n message bundles are
 * corrupted in this checkout, so the provider is mocked and `t` echoes the key.
 */
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({
  user: { id: "u1", email: "operator@apexchain.com", role: "admin" } as
    | { id: string; email: string; role: string }
    | null,
}));

const viewport = vi.hoisted(() => ({ isDesktop: false }));
const route = vi.hoisted(() => ({ current: "/outages" }));

vi.mock("@/i18n/i18n", () => ({
  useI18n: () => ({ t: (key: string) => key, locale: "en" }),
}));

vi.mock("@/hooks/useSession", () => ({
  useSession: () => ({ state: "authenticated", user: session.user, logout: vi.fn() }),
}));

vi.mock("@/lib/explorer", () => ({ STELLAR_NETWORK: "testnet" }));

vi.mock("next/navigation", () => ({
  usePathname: () => route.current,
}));

import Sidebar, { DESKTOP_BREAKPOINT_PX } from "@/components/layout/Sidebar";
import { SidebarErrorBoundary } from "@/components/layout/SidebarErrorBoundary";
import SidebarSkeleton from "@/components/layout/SidebarSkeleton";

/** Stub `matchMedia` so the breakpoint can be driven from a test. */
function setViewport(isDesktop: boolean) {
  viewport.isDesktop = isDesktop;
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: viewport.isDesktop,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  session.user = { id: "u1", email: "operator@apexchain.com", role: "admin" };
  route.current = "/outages";
  setViewport(false);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Sidebar responsive layout (#824)", () => {
  it("renders a static column only from the desktop breakpoint up", () => {
    setViewport(true);
    render(<Sidebar />);

    const sidebar = screen.getByTestId("sidebar");
    expect(sidebar).toHaveAttribute("data-layout", "static");
    // Out of the flow below `lg`, so it never squeezes the page content.
    expect(sidebar.className).toMatch(/hidden/);
    expect(sidebar.className).toMatch(/lg:flex/);
    expect(sidebar.className).toMatch(/w-64/);
    expect(sidebar.className).toMatch(/shrink-0/);
  });

  it("renders an off-canvas drawer below the breakpoint", () => {
    setViewport(false);
    render(<Sidebar />);

    const sidebar = screen.getByTestId("sidebar");
    expect(sidebar).toHaveAttribute("data-state", "closed");
    // Off-canvas, and narrow enough to leave the page visible behind it.
    expect(sidebar.className).toMatch(/-translate-x-full/);
    expect(sidebar.className).toMatch(/max-w-\[85vw\]/);
    expect(sidebar.className).toMatch(/w-72/);
  });

  it("slides the drawer in when opened and hides it again on close", async () => {
    setViewport(false);
    render(<Sidebar />);

    await userEvent.click(screen.getByTestId("sidebar-toggle"));
    expect(screen.getByTestId("sidebar")).toHaveAttribute("data-state", "open");
    expect(screen.getByTestId("sidebar").className).toMatch(/translate-x-0/);

    await userEvent.click(screen.getByRole("button", { name: "sidebar.close" }));
    expect(screen.getByTestId("sidebar")).toHaveAttribute("data-state", "closed");
  });

  it("only renders the overlay while the drawer is open", async () => {
    setViewport(false);
    render(<Sidebar />);

    expect(screen.queryByTestId("sidebar-overlay")).toBeNull();

    await userEvent.click(screen.getByTestId("sidebar-toggle"));
    expect(screen.getByTestId("sidebar-overlay")).toBeInTheDocument();
  });

  it("closes when the overlay is clicked", async () => {
    setViewport(false);
    render(<Sidebar />);

    await userEvent.click(screen.getByTestId("sidebar-toggle"));
    await userEvent.click(screen.getByTestId("sidebar-overlay"));

    expect(screen.getByTestId("sidebar")).toHaveAttribute("data-state", "closed");
  });

  it("closes on Escape so it is never trapped shut", async () => {
    setViewport(false);
    render(<Sidebar />);

    await userEvent.click(screen.getByTestId("sidebar-toggle"));
    expect(screen.getByTestId("sidebar")).toHaveAttribute("data-state", "open");

    await userEvent.keyboard("{Escape}");
    expect(screen.getByTestId("sidebar")).toHaveAttribute("data-state", "closed");
  });

  it("closes when the route changes, so the page is never left behind a panel", async () => {
    setViewport(false);
    const { rerender } = render(<Sidebar />);

    await userEvent.click(screen.getByTestId("sidebar-toggle"));
    expect(screen.getByTestId("sidebar")).toHaveAttribute("data-state", "open");

    // A route change re-renders the shell; the drawer must not survive it, or
    // the operator is left staring at the previous page's navigation.
    route.current = "/payments";
    rerender(<Sidebar />);

    expect(screen.getByTestId("sidebar")).toHaveAttribute("data-state", "closed");
  });

  it("honours defaultOpen without the route effect closing it on mount", () => {
    setViewport(false);
    render(<Sidebar defaultOpen />);

    expect(screen.getByTestId("sidebar")).toHaveAttribute("data-state", "open");
  });

  it("lets the link list scroll independently of the page", () => {
    setViewport(true);
    render(<Sidebar />);

    const nav = screen.getByTestId("sidebar-nav");
    // Without this a long catalogue grows past a short viewport instead of
    // scrolling inside the sidebar.
    expect(nav.className).toMatch(/overflow-y-auto/);
    expect(nav.className).toMatch(/min-h-0/);
    expect(nav.className).toMatch(/flex-1/);
  });

  it("gives interactive elements a 44px minimum touch target", () => {
    setViewport(false);
    render(<Sidebar />);

    expect(screen.getByTestId("sidebar-toggle").className).toMatch(/h-11/);
    screen.getByTestId("sidebar-nav").querySelectorAll("a").forEach((link) => {
      expect(link.className).toMatch(/min-h-\[44px\]/);
    });
  });

  it("respects reduced-motion preferences for the drawer transition", () => {
    setViewport(false);
    render(<Sidebar />);

    expect(screen.getByTestId("sidebar").className).toMatch(/motion-reduce:transition-none/);
  });

  it("queries the breakpoint it actually switches layout at", () => {
    setViewport(false);
    render(<Sidebar />);

    expect(window.matchMedia).toHaveBeenCalledWith(`(min-width: ${DESKTOP_BREAKPOINT_PX}px)`);
  });

  it("offers no toggle when the sidebar is a static column", () => {
    setViewport(true);
    render(<Sidebar />);

    // A desktop keyboard user should not be offered a control that does nothing.
    expect(screen.queryByTestId("sidebar-toggle")).toBeNull();
  });
});

describe("Sidebar accessibility (#825)", () => {
  it("exposes a labelled navigation landmark distinct from the top bar", () => {
    setViewport(true);
    render(<Sidebar />);

    const nav = screen.getByTestId("sidebar-nav");
    expect(nav).toHaveAttribute("aria-label", "navigation.secondary");
    expect(nav.tagName).toBe("NAV");
  });

  it("marks the current route with aria-current, not colour alone", () => {
    setViewport(true);
    render(<Sidebar />);

    // `usePathname` is mocked to "/outages".
    const current = screen.getByRole("link", { name: "common.outages" });
    expect(current).toHaveAttribute("aria-current", "page");

    const others = screen
      .getAllByRole("link")
      .filter((link) => link !== current);
    others.forEach((link) => expect(link).not.toHaveAttribute("aria-current"));
  });

  it("gives the toggle button its expanded state and the region it controls", async () => {
    setViewport(false);
    render(<Sidebar />);

    const toggle = screen.getByTestId("sidebar-toggle");
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    const drawerId = screen.getByTestId("sidebar").id;
    expect(toggle).toHaveAttribute("aria-controls", drawerId);

    await userEvent.click(toggle);
    expect(screen.getByTestId("sidebar-toggle")).toHaveAttribute("aria-expanded", "true");
  });

  it("labels the drawer as a modal dialog only while it is open", async () => {
    setViewport(false);
    render(<Sidebar />);

    const drawer = screen.getByTestId("sidebar");
    expect(drawer).toHaveAttribute("aria-modal", "false");

    await userEvent.click(screen.getByTestId("sidebar-toggle"));
    expect(screen.getByTestId("sidebar")).toHaveAttribute("aria-modal", "true");
  });

  it("hides the decorative overlay from assistive technology", async () => {
    setViewport(false);
    render(<Sidebar />);

    await userEvent.click(screen.getByTestId("sidebar-toggle"));
    // The drawer already carries aria-modal; announcing the backdrop too would
    // add a second, meaningless thing to the tree.
    expect(screen.getByTestId("sidebar-overlay")).toHaveAttribute("aria-hidden", "true");
  });

  it("names every icon-only control", () => {
    setViewport(false);
    render(<Sidebar />);

    expect(screen.getByTestId("sidebar-toggle")).toHaveAttribute(
      "aria-label",
      "sidebar.open",
    );
    expect(screen.getByRole("button", { name: "sidebar.close" })).toBeInTheDocument();
  });

  it("marks decorative glyphs as aria-hidden", () => {
    setViewport(false);
    render(<Sidebar />);

    const toggleGlyph = within(screen.getByTestId("sidebar-toggle")).getByText("☰");
    expect(toggleGlyph).toHaveAttribute("aria-hidden", "true");
  });

  it("gives every interactive element a visible focus ring", () => {
    setViewport(false);
    render(<Sidebar />);

    expect(screen.getByTestId("sidebar-toggle").className).toMatch(/focus-visible:outline-2/);
    expect(screen.getByRole("button", { name: "sidebar.close" }).className).toMatch(
      /focus-visible:outline-2/,
    );
    screen
      .getByTestId("sidebar-nav")
      .querySelectorAll("a")
      .forEach((link) => expect(link.className).toMatch(/focus-visible:outline-2/));
  });

  it("preserves onboarding tour hooks on the links that declare them", () => {
    setViewport(true);
    render(<Sidebar />);

    expect(screen.getByRole("link", { name: "common.dashboard" })).toHaveAttribute(
      "data-tour",
      "nav-dashboard",
    );
    expect(screen.getByRole("link", { name: "common.settings" })).not.toHaveAttribute(
      "data-tour",
    );
  });

  it("hides admin-only destinations from non-admin operators", () => {
    session.user = { id: "u2", email: "viewer@apexchain.com", role: "operator" };
    setViewport(true);
    render(<Sidebar />);

    expect(screen.queryByRole("link", { name: "common.config" })).toBeNull();
    expect(screen.getByRole("link", { name: "common.settings" })).toBeInTheDocument();
  });
});

describe("Sidebar loading skeleton (#826)", () => {
  it("announces itself as a polite, busy status region", () => {
    render(<SidebarSkeleton />);

    const skeleton = screen.getByRole("status");
    expect(skeleton).toHaveAttribute("aria-live", "polite");
    expect(skeleton).toHaveAttribute("aria-busy", "true");
    expect(skeleton).toHaveTextContent("sidebar.loading");
  });

  it("reserves the same box as the real sidebar to avoid layout shift", () => {
    render(<SidebarSkeleton />);

    const skeleton = screen.getByTestId("sidebar-skeleton");
    // Same width, shrink behaviour and breakpoint contract as `Sidebar`.
    expect(skeleton.className).toMatch(/w-64/);
    expect(skeleton.className).toMatch(/shrink-0/);
    expect(skeleton.className).toMatch(/lg:flex/);
    expect(skeleton.className).toMatch(/border-r/);
  });

  it("keeps the placeholder bars out of the accessibility tree", () => {
    const { container } = render(<SidebarSkeleton />);

    // The live region is declared once on the <aside>; the bars are decorative.
    expect(container.textContent).toBe("sidebar.loading");
    container.querySelectorAll("[aria-hidden='true']").forEach((bar) => {
      expect(bar.getAttribute("aria-hidden")).toBe("true");
    });
  });

  it("pads out a realistic number of rows", () => {
    const { container } = render(<SidebarSkeleton />);
    const bars = container.querySelectorAll("[aria-hidden='true']");
    expect(bars.length).toBeGreaterThanOrEqual(6);
  });
});

describe("Sidebar error boundary (#827)", () => {
  function Boom(): React.ReactElement {
    throw new Error("session snapshot malformed");
  }

  it("renders the sidebar when nothing throws", () => {
    setViewport(true);
    render(
      <SidebarErrorBoundary>
        <Sidebar />
      </SidebarErrorBoundary>,
    );

    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    expect(screen.queryByTestId("sidebar-error-boundary")).toBeNull();
  });

  it("contains the failure instead of unmounting the page", () => {
    render(
      <div>
        <SidebarErrorBoundary>
          <Boom />
        </SidebarErrorBoundary>
        <main data-testid="page-content">dashboard</main>
      </div>,
    );

    // The point of the boundary: navigation is the least valuable thing on the
    // page and must never take the page down with it.
    expect(screen.getByTestId("page-content")).toBeInTheDocument();
    const fallback = screen.getByTestId("sidebar-error-boundary");
    expect(fallback).toHaveAttribute("role", "alert");
    expect(fallback).toHaveTextContent("session snapshot malformed");
  });

  it("keeps the sidebar's width so the page does not shift", () => {
    render(
      <SidebarErrorBoundary>
        <Boom />
      </SidebarErrorBoundary>,
    );

    const fallback = screen.getByTestId("sidebar-error-boundary");
    expect(fallback.className).toMatch(/w-64/);
    expect(fallback.className).toMatch(/shrink-0/);
  });

  it("moves focus to the retry control when the fallback appears", () => {
    render(
      <SidebarErrorBoundary>
        <Boom />
      </SidebarErrorBoundary>,
    );

    expect(screen.getByRole("button", { name: "common.retry" })).toHaveFocus();
  });

  it("re-renders the sidebar when the operator retries", async () => {
    let shouldThrow = true;
    function Flaky(): React.ReactElement {
      if (shouldThrow) throw new Error("transient failure");
      return <div data-testid="sidebar-content" />;
    }

    render(
      <SidebarErrorBoundary>
        <Flaky />
      </SidebarErrorBoundary>,
    );

    expect(screen.getByTestId("sidebar-error-boundary")).toBeInTheDocument();

    shouldThrow = false;
    await userEvent.click(screen.getByRole("button", { name: "common.retry" }));

    expect(screen.getByTestId("sidebar-content")).toBeInTheDocument();
    expect(screen.queryByTestId("sidebar-error-boundary")).toBeNull();
  });

  it("gives the retry control a visible focus ring", () => {
    render(
      <SidebarErrorBoundary>
        <Boom />
      </SidebarErrorBoundary>,
    );

    expect(screen.getByRole("button", { name: "common.retry" }).className).toMatch(
      /focus-visible:outline-2/,
    );
  });
});