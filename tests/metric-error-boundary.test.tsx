/** ApexChain Frontend Test Suite */
/**
 * Issue #607 — a dashboard tile used to be able to take the whole page down
 * with it, because the only boundary was the route-level `error.tsx`. These
 * tests pin the replacement: the failure stays inside its own tile, siblings
 * keep rendering, and the fallback offers a keyboard-reachable retry.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import MetricErrorBoundary from "@/components/dashboard/MetricErrorBoundary";

function Exploding({ message = "bad metric" }: { message?: string }): React.ReactNode {
  throw new Error(message);
}

describe("MetricErrorBoundary (#607)", () => {
  beforeEach(() => {
    // React logs caught render errors; keep the test output clean.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("renders its children while they are healthy", () => {
    render(
      <MetricErrorBoundary title="SLA Compliance">
        <p>SLA Compliance</p>
      </MetricErrorBoundary>,
    );

    expect(screen.getByText("SLA Compliance")).toBeInTheDocument();
    expect(screen.queryByTestId("metric-error-boundary")).not.toBeInTheDocument();
  });

  it("contains a failing tile and keeps its siblings rendered", () => {
    render(
      <div>
        <MetricErrorBoundary title="Total Penalties">
          <Exploding message="penalties.total is not a number" />
        </MetricErrorBoundary>
        <MetricErrorBoundary title="SLA Compliance">
          <p>92.5%</p>
        </MetricErrorBoundary>
        <MetricErrorBoundary title="Net Balance">
          <p>+$380</p>
        </MetricErrorBoundary>
      </div>,
    );

    const fallback = screen.getByTestId("metric-error-boundary");
    expect(fallback).toHaveAttribute("data-metric", "Total Penalties");
    expect(fallback).toHaveTextContent("Total Penalties unavailable");
    expect(fallback).toHaveTextContent("penalties.total is not a number");

    // The healthy tiles are untouched by their sibling's failure.
    expect(screen.getByText("92.5%")).toBeInTheDocument();
    expect(screen.getByText("+$380")).toBeInTheDocument();
    expect(screen.getAllByTestId("metric-error-boundary")).toHaveLength(1);
  });

  it("announces the failure as an alert", () => {
    render(
      <MetricErrorBoundary title="Total Rewards">
        <Exploding />
      </MetricErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toHaveAttribute("data-metric", "Total Rewards");
  });

  it("focuses the retry control so the fallback is keyboard-reachable", () => {
    render(
      <MetricErrorBoundary title="SLA Compliance">
        <Exploding />
      </MetricErrorBoundary>,
    );

    const retry = screen.getByRole("button", { name: "Retry SLA Compliance" });
    expect(retry).toHaveFocus();
    expect(retry).toBeEnabled();
  });

  it("re-renders the tile and refreshes its data source when retried", () => {
    const onRetry = vi.fn();

    render(
      <MetricErrorBoundary title="Total Penalties" onRetry={onRetry}>
        <Exploding />
      </MetricErrorBoundary>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Retry Total Penalties" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
    // The data is still malformed, so the tile re-fails in isolation rather
    // than restoring a half-rendered card.
    expect(screen.getByTestId("metric-error-boundary")).toBeInTheDocument();
  });

  it("recovers once the failing child stops throwing", () => {
    let shouldThrow = true;
    const Flaky = () => {
      if (shouldThrow) throw new Error("transient metric error");
      return <p>Recovered metric</p>;
    };

    render(
      <MetricErrorBoundary title="Net Balance">
        <Flaky />
      </MetricErrorBoundary>,
    );

    expect(screen.getByTestId("metric-error-boundary")).toBeInTheDocument();

    shouldThrow = false;
    fireEvent.click(screen.getByRole("button", { name: "Retry Net Balance" }));

    expect(screen.getByText("Recovered metric")).toBeInTheDocument();
    expect(screen.queryByTestId("metric-error-boundary")).not.toBeInTheDocument();
  });
});
