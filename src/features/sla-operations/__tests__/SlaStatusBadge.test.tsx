/** ApexChain Frontend Test Suite */
/** Issue #1021 — SLA status badge states and accessible labels. */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SlaStatusBadge } from "@/features/sla-operations/components/SlaStatusBadge";

describe("SlaStatusBadge (#1021)", () => {
  it.each([
    ["met", "met", "Met"],
    ["breached", "violated", "Violated"],
    ["in progress", "pending", "Pending"],
    ["under review", "disputed", "Disputed"],
    ["not-a-status", "unknown", "Unknown"],
  ])("renders %s as the %s status", (status, outcome, label) => {
    render(<SlaStatusBadge status={status} />);

    expect(screen.getByRole("status", { name: `SLA status: ${label}` })).toHaveAttribute(
      "data-sla-outcome",
      outcome,
    );
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it.each([null, undefined])("labels a nullish status as unknown (%s)", (status) => {
    render(<SlaStatusBadge status={status} />);

    expect(screen.getByRole("status", { name: "SLA status: Unknown" })).toHaveAttribute(
      "data-sla-outcome",
      "unknown",
    );
  });
});
