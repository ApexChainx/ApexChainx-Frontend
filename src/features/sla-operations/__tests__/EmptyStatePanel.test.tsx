/** ApexChain Frontend Test Suite */
/** Issue #982 — empty state panel variants, semantics and action. */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EmptyStatePanel } from "@/features/sla-operations/components/EmptyStatePanel";

describe("EmptyStatePanel (#982)", () => {
  it("renders a labelled status region with title and description", () => {
    render(
      <EmptyStatePanel title="No outages" description="Nothing has been reported yet." />,
    );

    const panel = screen.getByRole("status", { name: "No outages" });
    expect(panel).toHaveAttribute("data-variant", "empty");
    expect(screen.getByRole("heading", { level: 3, name: "No outages" })).toBeInTheDocument();
    expect(screen.getByText("Nothing has been reported yet.")).toBeInTheDocument();
  });

  it("uses the requested heading level", () => {
    render(<EmptyStatePanel title="Nothing here" headingLevel={2} />);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });

  it("announces the error variant as an alert", () => {
    render(<EmptyStatePanel title="Could not load outages" variant="error" />);
    expect(screen.getByRole("alert", { name: "Could not load outages" })).toHaveAttribute(
      "data-variant",
      "error",
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("supports the no-results variant", () => {
    render(<EmptyStatePanel title="No matches" variant="no-results" />);
    expect(screen.getByRole("status")).toHaveAttribute("data-variant", "no-results");
  });

  it("omits the description, icon and action when not provided", () => {
    render(<EmptyStatePanel title="Empty" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(document.querySelector("[aria-hidden='true']")).toBeNull();
  });

  it("hides the icon from assistive technology", () => {
    render(<EmptyStatePanel title="Empty" icon={<span data-testid="icon">!</span>} />);
    expect(screen.getByTestId("icon").parentElement).toHaveAttribute("aria-hidden", "true");
  });

  it("renders a button action that calls back once per click", () => {
    const onClick = vi.fn();
    render(<EmptyStatePanel title="No matches" action={{ label: "Clear filters", onClick }} />);

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not call a disabled action", () => {
    const onClick = vi.fn();
    render(
      <EmptyStatePanel title="Offline" action={{ label: "Retry", onClick, disabled: true }} />,
    );

    const button = screen.getByRole("button", { name: "Retry" });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("renders extra children", () => {
    render(
      <EmptyStatePanel title="Empty">
        <a href="/outages/new">Report an outage</a>
      </EmptyStatePanel>,
    );
    expect(screen.getByRole("link", { name: "Report an outage" })).toBeInTheDocument();
  });
});
