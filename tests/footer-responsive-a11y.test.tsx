/**
 * ApexChain Frontend Test Suite — Footer responsive layout (#808), loading
 * skeleton (#810) and error boundary (#811).
 *
 * The i18n message bundles are corrupted in this checkout, so the provider is
 * mocked: `t` echoes the key, which keeps the assertions about layout and
 * markup independent of the (unavailable) translations.
 */
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({
  user: { id: "u1", email: "operator@apexchain.com", role: "admin" } as
    | { id: string; email: string; role: string }
    | null,
}));

vi.mock("@/i18n/i18n", () => ({
  useI18n: () => ({
    // Echo the key, but interpolate `{year}` so the copyright assertion can
    // still prove the parameter reached the translator.
    t: (key: string, params?: Record<string, string | number>) => {
      if (key === "footer.copyright") return `footer.copyright:${params?.year}`;
      if (key === "footer.network") return `footer.network:${params?.network}`;
      return key;
    },
    locale: "en",
  }),
}));

vi.mock("@/hooks/useSession", () => ({
  useSession: () => ({ state: "authenticated", user: session.user, logout: vi.fn() }),
}));

vi.mock("@/lib/explorer", () => ({ STELLAR_NETWORK: "testnet" }));

import Footer from "@/components/layout/Footer";
import { FooterErrorBoundary } from "@/components/layout/FooterErrorBoundary";
import FooterSkeleton from "@/components/layout/FooterSkeleton";

beforeEach(() => {
  session.user = { id: "u1", email: "operator@apexchain.com", role: "admin" };
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Footer responsive layout (#808)", () => {
  it("stacks the brand block above the link columns on narrow viewports", () => {
    render(<Footer year={2026} />);

    const footer = screen.getByTestId("site-footer");
    // The outer row is a column by default and only becomes a row at `md`,
    // which is what stops the link columns overflowing a 320px viewport.
    expect(footer.querySelector(".flex.flex-col")?.className).toMatch(/md:flex-row/);
  });

  it("promotes the link columns to a responsive grid instead of a fixed row", () => {
    render(<Footer year={2026} />);

    const links = screen.getByTestId("footer-links");
    expect(links.className).toMatch(/grid/);
    expect(links.className).toMatch(/grid-cols-1/);
    expect(links.className).toMatch(/sm:grid-cols-2/);
    expect(links.className).toMatch(/lg:grid-cols-3/);
  });

  it("keeps the legal row wrapping rather than overflowing", () => {
    render(<Footer year={2026} />);

    const legalRow = screen
      .getByTestId("site-footer")
      .querySelector(".mt-8.flex.flex-col");
    expect(legalRow?.className).toMatch(/sm:flex-row/);
    expect(legalRow?.className).toMatch(/sm:justify-between/);
  });

  it("allows long unbroken text to wrap instead of forcing a scrollbar", () => {
    render(<Footer year={2026} />);

    const footer = screen.getByTestId("site-footer");
    expect(footer.className).toContain("w-full");
    // Every text container that holds variable-length content opts into
    // wrapping / shrinking.
    expect(footer.querySelectorAll(".break-words").length).toBeGreaterThan(0);
    expect(footer.querySelectorAll(".min-w-0").length).toBeGreaterThan(0);
  });

  it("is pinned to the bottom of the shell on short pages", () => {
    render(<Footer year={2026} />);

    // `mt-auto` inside the body column flex declared in app/layout.tsx is what
    // keeps the footer below the content instead of floating under it.
    expect(screen.getByTestId("site-footer").className).toContain("mt-auto");
  });

  it("pins the copyright year passed by the caller", () => {
    render(<Footer year={2026} />);
    expect(screen.getByText("footer.copyright:2026")).toBeInTheDocument();
  });

  it("hides admin-only columns from non-admin operators", () => {
    session.user = { id: "u2", email: "viewer@apexchain.com", role: "operator" };
    render(<Footer year={2026} />);

    expect(screen.queryByText("common.config")).toBeNull();
    expect(screen.queryByText("common.webhooks")).toBeNull();
    expect(screen.getByText("common.settings")).toBeInTheDocument();
  });
});

describe("Footer accessibility (#809)", () => {
  it("exposes a named contentinfo landmark", () => {
    render(<Footer year={2026} />);

    const footer = screen.getByRole("contentinfo");
    expect(footer).toHaveAttribute("aria-label", "footer.landmark");
  });

  it("labels the link region as a navigation landmark", () => {
    render(<Footer year={2026} />);

    expect(screen.getByRole("navigation", { name: "footer.groups.platform" })).toBeInTheDocument();
  });

  it("gives the network badge a text alternative instead of a bare dot", () => {
    render(<Footer year={2026} />);

    expect(
      screen.getByRole("img", { name: "footer.network:testnet" }),
    ).toBeInTheDocument();
  });

  it("announces external links as opening in a new tab", () => {
    render(<Footer year={2026} />);

    const sourceLink = screen.getByRole("link", { name: /footer.links.sourceCode/ });
    expect(sourceLink).toHaveAttribute("target", "_blank");
    expect(sourceLink).toHaveAttribute("rel", "noopener noreferrer");
    expect(sourceLink).toHaveTextContent("footer.opensInNewTab");
    // The arrow glyph is decorative and must not be announced.
    expect(within(sourceLink).getByText("↗")).toHaveAttribute("aria-hidden", "true");
  });

  it("gives every footer link a visible focus ring", () => {
    render(<Footer year={2026} />);

    const footer = screen.getByTestId("site-footer");
    const anchors = Array.from(footer.querySelectorAll("a"));
    expect(anchors.length).toBeGreaterThan(0);
    anchors.forEach((anchor) => {
      expect(anchor.className).toMatch(/focus-visible:outline-2/);
      expect(anchor.className).toMatch(/focus-visible:outline-offset-2/);
    });
  });

  it("keeps internal footer links as same-tab router links", () => {
    render(<Footer year={2026} />);

    const dashboard = screen.getByRole("link", { name: "common.dashboard" });
    expect(dashboard).not.toHaveAttribute("target");
  });
});

describe("Footer loading skeleton (#810)", () => {
  it("announces itself as a polite, busy status region", () => {
    render(<FooterSkeleton />);

    const skeleton = screen.getByRole("status");
    expect(skeleton).toHaveAttribute("aria-live", "polite");
    expect(skeleton).toHaveAttribute("aria-busy", "true");
    expect(skeleton).toHaveTextContent("footer.loading");
  });

  it("reserves the same box as the real footer to avoid layout shift", () => {
    render(<FooterSkeleton />);

    const skeleton = screen.getByTestId("footer-skeleton");
    // Same outer box classes as `Footer`, plus the same responsive grid.
    expect(skeleton.className).toContain("mt-auto");
    expect(skeleton.className).toContain("w-full");
    expect(skeleton.className).toContain("max-w-7xl");
    expect(skeleton.querySelector(".lg\\:grid-cols-3")).not.toBeNull();
  });

  it("hides the decorative bars from assistive technology", () => {
    const { container } = render(<FooterSkeleton />);

    // The only readable content is the sr-only status label.
    expect(container.textContent).toBe("footer.loading");
  });
});

describe("Footer error boundary (#811)", () => {
  function Boom(): React.ReactElement {
    throw new Error("session snapshot malformed");
  }

  it("renders the children when nothing throws", () => {
    render(
      <FooterErrorBoundary>
        <Footer year={2026} />
      </FooterErrorBoundary>,
    );

    expect(screen.getByTestId("site-footer")).toBeInTheDocument();
    expect(screen.queryByTestId("footer-error-boundary")).toBeNull();
  });

  it("contains the failure instead of unmounting the shell", () => {
    render(
      <div data-testid="page-content">
        <FooterErrorBoundary>
          <Boom />
        </FooterErrorBoundary>
      </div>,
    );

    // The surrounding page stays mounted — this is the whole point of the
    // boundary: a footer failure must not take the dashboard with it.
    expect(screen.getByTestId("page-content")).toBeInTheDocument();
    const fallback = screen.getByTestId("footer-error-boundary");
    expect(fallback).toHaveAttribute("role", "alert");
    expect(fallback).toHaveTextContent("session snapshot malformed");
    expect(fallback).toHaveTextContent("footer.errorTitle");
  });

  it("moves focus to the retry control when the fallback appears", () => {
    render(
      <FooterErrorBoundary>
        <Boom />
      </FooterErrorBoundary>,
    );

    // Focused on mount so a keyboard user lands on the recovery control
    // instead of having to tab back into the shell.
    expect(screen.getByRole("button", { name: "footer.retry" })).toHaveFocus();
  });

  it("re-renders the children when the operator retries", async () => {
    let shouldThrow = true;
    function Flaky(): React.ReactElement {
      if (shouldThrow) throw new Error("transient failure");
      return <div data-testid="footer-content" />;
    }

    render(
      <FooterErrorBoundary>
        <Flaky />
      </FooterErrorBoundary>,
    );

    expect(screen.getByTestId("footer-error-boundary")).toBeInTheDocument();

    shouldThrow = false;
    await userEvent.click(screen.getByRole("button", { name: "footer.retry" }));

    expect(screen.getByTestId("footer-content")).toBeInTheDocument();
    expect(screen.queryByTestId("footer-error-boundary")).toBeNull();
  });

  it("gives the retry control a visible focus ring", () => {
    render(
      <FooterErrorBoundary>
        <Boom />
      </FooterErrorBoundary>,
    );

    expect(screen.getByRole("button", { name: "footer.retry" }).className).toMatch(
      /focus-visible:outline-2/,
    );
  });
});