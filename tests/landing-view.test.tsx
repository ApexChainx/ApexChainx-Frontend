/**
 * ApexChain Frontend Test Suite — reusable landing view (#787) and empty
 * state (#785).
 *
 * `next/dynamic` is mocked (a real lazy chunk cannot resolve in jsdom) and the
 * lazily-imported dashboard module is corrupted upstream, so it is never
 * executed.
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/dynamic", () => ({
  default: () =>
    function MockDynamic() {
      return <div data-testid="dashboard-view" />;
    },
}));

import Dashboard from "@/app/page";
import { LandingEmptyState, LandingView } from "@/components/landing/landing-view";

afterEach(cleanup);

function StubView() {
  return <div data-testid="stub-view">stub</div>;
}

describe("LandingView extraction (#787)", () => {
  it("renders the supplied view component", () => {
    render(<LandingView view={StubView} />);
    expect(screen.getByTestId("stub-view")).toBeInTheDocument();
  });

  it("is reusable for any lazily-loaded dashboard", () => {
    function OtherView() {
      return <div data-testid="other-view" />;
    }
    render(<LandingView view={OtherView} />);
    expect(screen.getByTestId("other-view")).toBeInTheDocument();
    expect(screen.queryByTestId("stub-view")).toBeNull();
  });

  it("is composed by the landing route", () => {
    render(<Dashboard />);
    expect(screen.getByTestId("dashboard-view")).toBeInTheDocument();
  });
});

describe("LandingView empty state (#785)", () => {
  it("renders a designed empty state when there is nothing to show", () => {
    render(<LandingView view={StubView} isEmpty />);

    const empty = screen.getByTestId("landing-empty-state");
    expect(empty).toHaveAttribute("role", "status");
    expect(empty).toHaveTextContent("Nothing to show yet");
    expect(screen.queryByTestId("stub-view")).toBeNull();
  });

  it("accepts a caller-supplied empty state", () => {
    render(
      <LandingView
        view={StubView}
        isEmpty
        emptyState={<div data-testid="custom-empty">nothing here</div>}
      />,
    );

    expect(screen.getByTestId("custom-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("landing-empty-state")).toBeNull();
  });

  it("exposes the empty state as a standalone component", () => {
    render(<LandingEmptyState message="No metrics for this period" />);
    expect(screen.getByTestId("landing-empty-state")).toHaveTextContent(
      "No metrics for this period",
    );
  });
});
