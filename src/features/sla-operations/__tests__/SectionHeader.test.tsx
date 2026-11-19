/** ApexChain Frontend Test Suite */
/** Issue #985 — section header heading level, description and actions. */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SectionHeader } from "@/features/sla-operations/components/SectionHeader";

describe("SectionHeader (#985)", () => {
  it("renders the title as a level-2 heading by default", () => {
    render(<SectionHeader title="Outage operations" />);
    expect(screen.getByRole("heading", { level: 2, name: "Outage operations" })).toBeInTheDocument();
  });

  it("uses the requested heading level", () => {
    render(<SectionHeader title="Webhooks" headingLevel={3} />);
    expect(screen.getByRole("heading", { level: 3, name: "Webhooks" })).toBeInTheDocument();
  });

  it("applies the given heading id", () => {
    render(<SectionHeader title="Payments" headingId="payments-heading" />);
    expect(screen.getByRole("heading", { name: "Payments" })).toHaveAttribute(
      "id",
      "payments-heading",
    );
  });

  it("renders an optional description", () => {
    render(<SectionHeader title="SLA trend" description="Compliance over the last 30 days" />);
    expect(screen.getByText("Compliance over the last 30 days")).toBeInTheDocument();
  });

  it("omits the description when not provided", () => {
    const { container } = render(<SectionHeader title="SLA trend" />);
    expect(container.querySelectorAll("p")).toHaveLength(0);
  });

  it("renders the given actions", () => {
    render(
      <SectionHeader
        title="Outages"
        actions={<button type="button">Export</button>}
      />,
    );
    expect(screen.getByRole("button", { name: "Export" })).toBeInTheDocument();
  });

  it("omits the actions row when not provided", () => {
    render(<SectionHeader title="Outages" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
