/** ApexChain Frontend Test Suite */
/** Issue #986 — timeline item rendering across categories and optional fields. */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TimelineItem } from "@/features/sla-operations/components/TimelineItem";
import type { TimelineEvent } from "@/features/sla-operations/types/timeline";

const baseEvent: TimelineEvent = {
  id: "evt-1",
  category: "outage",
  title: "Outage detected",
  timestamp: "2026-01-15T10:00:00.000Z",
};

describe("TimelineItem (#986)", () => {
  it("renders as a list item by default, labelled with its category", () => {
    render(
      <ol>
        <TimelineItem event={baseEvent} />
      </ol>,
    );
    const item = screen.getByRole("listitem");
    expect(item).toHaveAttribute("data-category", "outage");
    expect(screen.getByText("Outage detected")).toBeInTheDocument();
    expect(screen.getByText("Outage:", { exact: false })).toBeInTheDocument();
  });

  it("renders a plain div when as='div'", () => {
    render(<TimelineItem event={baseEvent} as="div" />);
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
    expect(screen.getByText("Outage detected")).toBeInTheDocument();
  });

  it("renders the badge label, description and actor when provided", () => {
    const event: TimelineEvent = {
      ...baseEvent,
      label: "P1",
      description: "Payment gateway unresponsive.",
      actor: { kind: "operator", id: "op-1", label: "Jane Doe" },
    };
    render(<TimelineItem event={event} />);

    expect(screen.getByText("P1")).toBeInTheDocument();
    expect(screen.getByText("Payment gateway unresponsive.")).toBeInTheDocument();
    expect(screen.getByText("By Jane Doe")).toBeInTheDocument();
  });

  it("omits the badge, description and actor when absent", () => {
    render(<TimelineItem event={baseEvent} />);
    expect(screen.queryByText(/^By /)).not.toBeInTheDocument();
  });

  it("falls back to the raw string for an unparsable timestamp", () => {
    render(<TimelineItem event={{ ...baseEvent, timestamp: "not-a-date" }} />);
    expect(screen.getByText("not-a-date")).toBeInTheDocument();
  });

  it("renders a time element with the ISO timestamp as dateTime", () => {
    const { container } = render(<TimelineItem event={baseEvent} />);
    const time = container.querySelector("time");
    expect(time).toHaveAttribute("dateTime", baseEvent.timestamp);
  });

  it.each([
    ["sla", "SLA"],
    ["payment", "Payment"],
    ["webhook", "Webhook"],
    ["annotation", "Annotation"],
    ["system", "System"],
  ] as const)("renders the %s category with its accessible label", (category, label) => {
    render(<TimelineItem event={{ ...baseEvent, category }} />);
    expect(screen.getByText(`${label}:`, { exact: false })).toBeInTheDocument();
  });
});
