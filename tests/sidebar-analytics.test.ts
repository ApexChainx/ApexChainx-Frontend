import { afterEach, describe, expect, it, vi } from "vitest";
import {
  setSidebarAnalyticsSink,
  SIDEBAR_EVENTS,
  trackSidebarEvent,
} from "@/lib/sidebar-analytics";

afterEach(() => setSidebarAnalyticsSink(null));

describe("sidebar analytics", () => {
  it("records events with query strings and fragments removed", () => {
    const sink = vi.fn();
    setSidebarAnalyticsSink(sink);
    trackSidebarEvent(SIDEBAR_EVENTS.linkClick, { href: "/outages?token=private#row" });
    expect(sink).toHaveBeenCalledWith(SIDEBAR_EVENTS.linkClick, { href: "/outages" });
  });

  it("drops external URLs and contains sink failures", () => {
    const sink = vi.fn(() => { throw new Error("sink unavailable"); });
    setSidebarAnalyticsSink(sink);
    expect(() => trackSidebarEvent(SIDEBAR_EVENTS.linkClick, { href: "https://example.com/?secret=1" })).not.toThrow();
    expect(sink).toHaveBeenCalledWith(SIDEBAR_EVENTS.linkClick, {});
  });
});
