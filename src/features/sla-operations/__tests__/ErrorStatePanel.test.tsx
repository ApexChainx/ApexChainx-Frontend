/** ApexChain Frontend Test Suite */
/** Issue #984 — error state panel semantics and retry affordance. */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ErrorStatePanel } from "@/features/sla-operations/components/ErrorStatePanel";

describe("ErrorStatePanel (#984)", () => {
  it("renders an alert with the default title", () => {
    render(<ErrorStatePanel />);
    expect(screen.getByRole("alert", { name: "Something went wrong" })).toBeInTheDocument();
  });

  it("renders a custom title and description", () => {
    render(
      <ErrorStatePanel title="Could not load outages" description="The request timed out." />,
    );
    expect(screen.getByRole("alert", { name: "Could not load outages" })).toBeInTheDocument();
    expect(screen.getByText("The request timed out.")).toBeInTheDocument();
  });

  it("uses the requested heading level", () => {
    render(<ErrorStatePanel headingLevel={2} />);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });

  it("omits the retry button when onRetry is not provided", () => {
    render(<ErrorStatePanel />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("calls onRetry once per click", () => {
    const onRetry = vi.fn();
    render(<ErrorStatePanel onRetry={onRetry} />);

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("supports a custom retry label", () => {
    const onRetry = vi.fn();
    render(<ErrorStatePanel onRetry={onRetry} retryLabel="Reload data" />);
    expect(screen.getByRole("button", { name: "Reload data" })).toBeInTheDocument();
  });

  it("disables and relabels the retry button while retrying", () => {
    const onRetry = vi.fn();
    render(<ErrorStatePanel onRetry={onRetry} isRetrying />);

    const button = screen.getByRole("button", { name: "Retrying..." });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it("hides the icon from assistive technology", () => {
    render(<ErrorStatePanel icon={<span data-testid="icon">!</span>} />);
    expect(screen.getByTestId("icon").parentElement).toHaveAttribute("aria-hidden", "true");
  });
});
