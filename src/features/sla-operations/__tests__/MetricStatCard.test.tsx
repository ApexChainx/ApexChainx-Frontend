/** ApexChain Frontend Test Suite */
/** Issue #979 — metric stat card states and accessibility. */
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MetricStatCard } from "@/features/sla-operations/components/MetricStatCard";

describe("MetricStatCard (#979)", () => {
  it("renders the label, value and unit in a labelled article", () => {
    render(<MetricStatCard label="Mean time to repair" value="42" unit="min" />);

    const card = screen.getByRole("article", { name: "Mean time to repair" });
    expect(within(card).getByTestId("metric-stat-value")).toHaveTextContent("42");
    expect(card).toHaveTextContent("min");
    expect(card).toHaveAttribute("data-state", "neutral");
    expect(card).toHaveAttribute("aria-busy", "false");
  });

  it("renders numeric values, including zero", () => {
    render(<MetricStatCard label="Open outages" value={0} />);
    expect(screen.getByTestId("metric-stat-value")).toHaveTextContent("0");
  });

  it("shows a placeholder with screen-reader text for missing values", () => {
    for (const value of [null, undefined, "", "   ", Number.NaN]) {
      const { unmount } = render(<MetricStatCard label="Compliance" value={value} />);
      expect(screen.queryByTestId("metric-stat-value")).not.toBeInTheDocument();
      expect(screen.getByText("No data")).toBeInTheDocument();
      expect(screen.getByText("—")).toHaveAttribute("aria-hidden", "true");
      unmount();
    }
  });

  it("supports a custom empty label", () => {
    render(<MetricStatCard label="Compliance" emptyLabel="n/a" />);
    expect(screen.getByText("n/a")).toBeInTheDocument();
  });

  it("applies the semantic state", () => {
    render(<MetricStatCard label="Violations" value="3" state="negative" />);
    expect(screen.getByRole("article")).toHaveAttribute("data-state", "negative");
  });

  it("describes the trend for assistive technology", () => {
    render(
      <MetricStatCard
        label="Compliance"
        value="99.5%"
        trend={{ direction: "down", value: "-0.4%", comparisonLabel: "vs last week" }}
      />,
    );
    expect(screen.getByText("Down:")).toHaveClass("sr-only");
    expect(screen.getByText(/-0\.4% vs last week/)).toBeInTheDocument();
    expect(screen.getByText("▼")).toHaveAttribute("aria-hidden", "true");
  });

  it("renders helper text", () => {
    render(<MetricStatCard label="Penalties" value="$12" helperText="Last 30 days" />);
    expect(screen.getByText("Last 30 days")).toBeInTheDocument();
  });

  it("shows a busy placeholder instead of the value while loading", () => {
    render(<MetricStatCard label="Compliance" value="99%" isLoading />);
    expect(screen.getByRole("article")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Loading Compliance");
    expect(screen.queryByTestId("metric-stat-value")).not.toBeInTheDocument();
  });

  it("gives each card its own label id", () => {
    render(
      <>
        <MetricStatCard label="First" value="1" />
        <MetricStatCard label="Second" value="2" />
      </>,
    );
    expect(screen.getByRole("article", { name: "First" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Second" })).toBeInTheDocument();
  });
});
