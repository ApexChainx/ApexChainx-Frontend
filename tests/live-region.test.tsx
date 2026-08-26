/** ApexChain Frontend Test Suite — live-region a11y primitives */
import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LiveRegion, LiveStatus, Announcer } from "@/components/ui/live-region";

afterEach(() => cleanup());

describe("LiveStatus", () => {
  it("renders with role=status and aria-live=polite", () => {
    const { getByRole } = render(<LiveStatus status="Operational" />);
    const el = getByRole("status");
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute("aria-live", "polite");
  });

  it("sets aria-atomic=true", () => {
    const { getByRole } = render(<LiveStatus status="Operational" />);
    expect(getByRole("status")).toHaveAttribute("aria-atomic", "true");
  });

  it("separates the visually-hidden label from the visible status", () => {
    const { getByRole, getByText } = render(
      <LiveStatus status="Degraded" label="Health" />,
    );
    const el = getByRole("status");
    // The label is sr-only and separated from the visible status
    const srOnly = el.querySelector(".sr-only");
    expect(srOnly).toBeInTheDocument();
    expect(srOnly).toHaveTextContent("Health:");
    // The visible status is aria-hidden
    expect(getByText("Degraded")).toHaveAttribute("aria-hidden", "true");
    expect(getByText("Degraded")).not.toHaveClass("sr-only");
  });

  it("defaults the label to 'Status'", () => {
    const { getByRole } = render(<LiveStatus status="Operational" />);
    const srOnly = getByRole("status").querySelector(".sr-only");
    expect(srOnly).toHaveTextContent("Status:");
  });

  it("forwards className to the container", () => {
    const { getByRole } = render(
      <LiveStatus status="Operational" className="custom-status" />,
    );
    expect(getByRole("status")).toHaveClass("custom-status");
  });
});

describe("LiveRegion", () => {
  it("renders with role=log and aria-live=polite by default", () => {
    const { getByRole } = render(<LiveRegion>Hello</LiveRegion>);
    const el = getByRole("log");
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute("aria-live", "polite");
  });

  it("uses aria-live=assertive when assertive is set", () => {
    const { getByRole } = render(<LiveRegion assertive>Hello</LiveRegion>);
    expect(getByRole("log")).toHaveAttribute("aria-live", "assertive");
  });

  it("sets aria-atomic=false", () => {
    const { getByRole } = render(<LiveRegion>Hello</LiveRegion>);
    expect(getByRole("log")).toHaveAttribute("aria-atomic", "false");
  });

  it("renders children", () => {
    const { getByText } = render(
      <LiveRegion>
        <span>Update available</span>
      </LiveRegion>,
    );
    expect(getByText("Update available")).toBeInTheDocument();
  });

  it("forwards className to the container", () => {
    const { getByRole } = render(
      <LiveRegion className="custom-region">Hi</LiveRegion>,
    );
    expect(getByRole("log")).toHaveClass("custom-region");
  });
});

describe("Announcer", () => {
  it("renders with role=log and aria-live=polite by default", () => {
    const { getByRole } = render(<Announcer message="Saved" />);
    const el = getByRole("log");
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute("aria-live", "polite");
  });

  it("uses aria-live=assertive when assertive is set", () => {
    const { getByRole } = render(<Announcer message="Error" assertive />);
    expect(getByRole("log")).toHaveAttribute("aria-live", "assertive");
  });

  it("sets aria-atomic=true", () => {
    const { getByRole } = render(<Announcer message="Saved" />);
    expect(getByRole("log")).toHaveAttribute("aria-atomic", "true");
  });

  it("applies the sr-only class to hide the message visually", () => {
    const { getByText } = render(<Announcer message="Saved" />);
    const el = getByText("Saved");
    expect(el).toHaveClass("sr-only");
    // Text content must be visible to AT but not on screen
    expect(el).toHaveAttribute("role", "log");
  });
});
