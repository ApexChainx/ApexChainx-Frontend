import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  RouteEmptyState,
  RouteErrorState,
  RouteLoadingState,
} from "@/components/ui/route-state";

describe("RouteErrorState", () => {
  it("announces errors with an assertive alert role", () => {
    render(
      <RouteErrorState
        title="Payments unavailable"
        description="The service is temporarily down."
      />,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    // The live region is assertive so screen readers interrupt to report it.
    expect(alert).toHaveAttribute("aria-live", "assertive");
    // The error title/description live inside the announced region.
    expect(alert).toHaveTextContent("Payments unavailable");
    expect(alert).toHaveTextContent("The service is temporarily down.");
  });
});

describe("RouteLoadingState", () => {
  it("uses a polite status live region without asserting", () => {
    render(
      <RouteLoadingState
        title="Loading payments"
        description="Retrieving the latest records."
      />,
    );

    const status = screen.getByRole("status");
    expect(status).toBeInTheDocument();
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent("Loading payments");
  });
});

describe("RouteEmptyState", () => {
  it("uses a polite status live region for empty results", () => {
    render(
      <RouteEmptyState
        title="No payments found"
        description="Try adjusting your filters."
      />,
    );

    const status = screen.getByRole("status");
    expect(status).toBeInTheDocument();
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent("No payments found");
  });
});
