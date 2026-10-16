/**
 * ApexChain Frontend Test Suite — landing route re-render optimisations
 * (#782) and unit coverage (#780).
 *
 * `next/dynamic` is mocked (it cannot resolve a real lazy chunk in jsdom) but
 * the mock records its arguments so we can assert the route wires a stable
 * fallback and disables SSR. The lazily-imported dashboard module is itself
 * corrupted upstream; the mock means it is never executed.
 */
import type { ReactElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const dynamicSpy = vi.hoisted(() => ({ calls: [] as unknown[][] }));

vi.mock("next/dynamic", () => ({
  default: (...args: unknown[]) => {
    dynamicSpy.calls.push(args);
    return function MockDynamic() {
      return <div data-testid="dashboard-view" />;
    };
  },
}));

import Dashboard from "@/app/page";
import { LandingLoadingFallback } from "@/components/landing/landing-loading";

afterEach(cleanup);

describe("LandingPage re-render optimisations (#782)", () => {
  it("exports a memoized route component", () => {
    expect((Dashboard as unknown as { $$typeof?: symbol }).$$typeof).toBe(
      Symbol.for("react.memo"),
    );
  });

  it("memoizes the loading fallback so its element type is stable", () => {
    expect(
      (LandingLoadingFallback as unknown as { $$typeof?: symbol }).$$typeof,
    ).toBe(Symbol.for("react.memo"));
  });

  it("configures next/dynamic with SSR off and a loading fallback", () => {
    expect(dynamicSpy.calls.length).toBeGreaterThan(0);
    const [, options] = dynamicSpy.calls[0] as [
      unknown,
      { ssr?: boolean; loading?: () => ReactElement },
    ];
    expect(options.ssr).toBe(false);
    expect(typeof options.loading).toBe("function");
  });

  it("renders the lazily-loaded dashboard view", () => {
    render(<Dashboard />);
    expect(screen.getByTestId("dashboard-view")).toBeInTheDocument();
  });
});

describe("LandingPage loading fallback (#780)", () => {
  it("announces loading politely", () => {
    render(<LandingLoadingFallback />);

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent("Loading dashboard...");
  });

  it("renders the same DOM node across a parent re-render (stable identity)", () => {
    const { rerender } = render(<LandingLoadingFallback />);
    const first = screen.getByRole("status");
    rerender(<LandingLoadingFallback />);
    const second = screen.getByRole("status");
    expect(second).toBe(first);
  });

  it("is the fallback wired into the dynamic import options", () => {
    const [, options] = dynamicSpy.calls[0] as [
      unknown,
      { loading?: () => ReactElement },
    ];
    render(<>{options.loading?.()}</>);
    expect(screen.getByRole("status")).toHaveTextContent("Loading dashboard...");
  });
});
