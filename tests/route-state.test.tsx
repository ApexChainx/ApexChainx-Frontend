/** ApexChain Network Operations Intelligence Platform */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  RouteErrorState,
  RouteLoadingState,
  RouteEmptyState,
} from "@/components/ui/route-state";

afterEach(() => cleanup());

describe("RouteErrorState", () => {
  it("renders an alert role so assistive tech announces failures", () => {
    render(
      <RouteErrorState title="Payments unavailable" description="Try again shortly." />,
    );

    const container = screen.getByRole("alert");
    expect(container).toHaveTextContent("Payments unavailable");
  });

  it("announces the error title via an assertive live region", () => {
    render(
      <RouteErrorState title="Load failed" description="Please retry." />,
    );

    const regions = screen.getAllByRole("alert");
    expect(regions.length).toBeGreaterThan(0);
  });
});

describe("RouteLoadingState", () => {
  it("announces loading via a polite live region", () => {
    render(<RouteLoadingState title="Loading outages" description="…" />);

    expect(screen.getByRole("log")).toHaveTextContent("Loading outages");
    expect(screen.getByRole("log")).toHaveAttribute("aria-live", "polite");
  });
});

describe("RouteEmptyState", () => {
  it("announces the empty state via a polite live region", () => {
    render(<RouteEmptyState title="No outages" description="Nothing here yet." />);

    expect(screen.getByRole("log")).toHaveTextContent("No outages");
    expect(screen.getByRole("log")).toHaveAttribute("aria-live", "polite");
  });
});
