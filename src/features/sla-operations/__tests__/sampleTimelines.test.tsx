/** ApexChain Frontend Test Suite */
/** Issue #1018 — sample incident timeline fixtures. */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { IncidentTimelinePanel } from "@/features/sla-operations/components/IncidentTimelinePanel";
import {
  SAMPLE_TIMELINES,
  activeEscalationIncident,
  emptyTimeline,
  getSampleTimelineById,
  resolvedCriticalIncident,
  webhookRetryActivity,
} from "@/features/sla-operations/fixtures/sampleTimelines";

describe("sampleTimelines fixtures (#1018)", () => {
  it("exposes four representative fixtures in a stable order", () => {
    expect(SAMPLE_TIMELINES).toEqual([
      resolvedCriticalIncident,
      activeEscalationIncident,
      webhookRetryActivity,
      emptyTimeline,
    ]);
  });

  it("uses unique fixture ids and globally unique event ids", () => {
    const fixtureIds = SAMPLE_TIMELINES.map((timeline) => timeline.id);
    const eventIds = SAMPLE_TIMELINES.flatMap((timeline) =>
      timeline.events.map((event) => event.id),
    );

    expect(new Set(fixtureIds).size).toBe(fixtureIds.length);
    expect(new Set(eventIds).size).toBe(eventIds.length);
  });

  it("orders events chronologically and uses parseable ISO timestamps", () => {
    for (const timeline of SAMPLE_TIMELINES) {
      const timestamps = timeline.events.map((event) => event.timestamp);

      for (const timestamp of timestamps) {
        expect(Number.isNaN(Date.parse(timestamp))).toBe(false);
        expect(new Date(timestamp).toISOString()).toBe(timestamp);
      }

      const parsed = timestamps.map((timestamp) => Date.parse(timestamp));
      expect(parsed).toEqual([...parsed].sort((a, b) => a - b));
    }
  });

  it("covers every timeline category and actor kind", () => {
    const events = SAMPLE_TIMELINES.flatMap((timeline) => timeline.events);
    const categories = new Set(events.map((event) => event.category));
    const actorKinds = new Set(
      events.flatMap((event) => (event.actor ? [event.actor.kind] : [])),
    );

    expect(categories).toEqual(
      new Set(["outage", "sla", "payment", "webhook", "annotation", "system"]),
    );
    expect(actorKinds).toEqual(
      new Set(["operator", "system", "webhook", "automation"]),
    );
  });

  it("covers resolved, in-flight, error and empty states", () => {
    const categoriesIn = (events: { category: string }[]) =>
      new Set(events.map((event) => event.category));

    expect(categoriesIn(resolvedCriticalIncident.events)).toContain("payment");
    expect(categoriesIn(activeEscalationIncident.events)).toContain("webhook");
    expect(
      webhookRetryActivity.events.filter((event) => event.label === "failed")
        .length,
    ).toBeGreaterThan(0);
    expect(emptyTimeline.events).toHaveLength(0);
  });

  it("looks fixtures up by id and returns undefined for unknown ids", () => {
    expect(getSampleTimelineById("sample_active_escalation")).toBe(
      activeEscalationIncident,
    );
    expect(getSampleTimelineById("sample_missing")).toBeUndefined();
  });

  it("can be rendered by IncidentTimelinePanel without adapters", () => {
    render(<IncidentTimelinePanel events={activeEscalationIncident.events} />);

    expect(
      screen.getByRole("heading", { name: "Incident timeline" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Packet loss above 8% sustained for five minutes"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("By Marcus Lindqvist").length).toBeGreaterThan(
      0,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(
      activeEscalationIncident.events.length,
    );
  });

  it("renders the empty prompt for the empty fixture", () => {
    render(<IncidentTimelinePanel events={emptyTimeline.events} />);

    expect(screen.getByText("No incident events recorded.")).toBeInTheDocument();
  });
});
