/** ApexChain Frontend Test Suite */
/** Issue #983 — loading skeleton block variants and accessibility. */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LoadingSkeletonBlock } from "@/features/sla-operations/components/LoadingSkeletonBlock";

describe("LoadingSkeletonBlock (#983)", () => {
  it("renders a single status region with the default label", () => {
    render(<LoadingSkeletonBlock />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("data-variant", "text");
    expect(screen.getByText("Loading content")).toBeInTheDocument();
  });

  it("accepts a custom accessible label", () => {
    render(<LoadingSkeletonBlock label="Loading outages" />);
    expect(screen.getByRole("status", { name: "Loading outages" })).toBeInTheDocument();
  });

  it("renders the requested number of text lines, clamped to a sane range", () => {
    const { container } = render(<LoadingSkeletonBlock variant="text" lines={5} />);
    expect(container.querySelectorAll("[aria-hidden='true'] > div")).toHaveLength(5);
  });

  it("clamps an out-of-range line count", () => {
    const { container } = render(<LoadingSkeletonBlock variant="text" lines={50} />);
    expect(container.querySelectorAll("[aria-hidden='true'] > div")).toHaveLength(12);
  });

  it("renders the card variant", () => {
    render(<LoadingSkeletonBlock variant="card" />);
    expect(screen.getByRole("status")).toHaveAttribute("data-variant", "card");
  });

  it("renders the table-row variant with one cell per line", () => {
    const { container } = render(<LoadingSkeletonBlock variant="table-row" lines={4} />);
    expect(screen.getByRole("status")).toHaveAttribute("data-variant", "table-row");
    expect(container.querySelectorAll("[aria-hidden='true'] > div")).toHaveLength(4);
  });

  it("renders the circle variant", () => {
    render(<LoadingSkeletonBlock variant="circle" />);
    expect(screen.getByRole("status")).toHaveAttribute("data-variant", "circle");
  });

  it("hides all decorative bars from assistive technology", () => {
    const { container } = render(<LoadingSkeletonBlock variant="card" />);
    container.querySelectorAll("[aria-hidden='true']").forEach((node) => {
      expect(node).toHaveAttribute("aria-hidden", "true");
    });
  });
});
