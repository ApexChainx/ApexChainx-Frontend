/** ApexChain Network Operations Intelligence Platform */
/**
 * Issue #569 — the create payload must not carry a client-minted id.
 *
 * The form used to submit `OUT-${Date.now()}` alongside the outage body.
 * Two operators submitting in the same millisecond collide, and a
 * client-authored id is a forgeable reference the server has to validate
 * before trusting. The backend owns identity now, so the strongest possible
 * assertion is on the wire shape.
 */
import { describe, expect, it } from "vitest";

import {
  buildOutageCreatePayload,
  type NewOutageFormState,
} from "@/features/outages/outage-create-payload";

const BASE_FORM: NewOutageFormState = {
  site_name: "  Lagos Node 1  ",
  site_id: "  site-lagos-1 ",
  severity: "high",
  status: "open",
  detected_at: "2026-01-31T09:15",
  description: "  Total upstream packet loss  ",
  affected_services: " DNS , VoIP ,, RTP ",
  affected_subscribers: " 1200 ",
  assigned_to: "  fatima ",
};

describe("buildOutageCreatePayload", () => {
  it("omits the id entirely so the backend assigns the canonical OUT- id", () => {
    const payload = buildOutageCreatePayload(BASE_FORM);

    expect(payload).not.toHaveProperty("id");
    expect(Object.keys(payload)).not.toContain("id");
    expect(JSON.stringify(payload)).not.toMatch(/OUT-/);
  });

  it("trims string fields and normalises the timestamp to ISO-8601", () => {
    const payload = buildOutageCreatePayload(BASE_FORM);

    expect(payload.site_name).toBe("Lagos Node 1");
    expect(payload.site_id).toBe("site-lagos-1");
    expect(payload.description).toBe("Total upstream packet loss");
    expect(payload.assigned_to).toBe("fatima");
    expect(payload.detected_at).toBe(new Date("2026-01-31T09:15").toISOString());
  });

  it("splits and cleans the comma-separated affected services", () => {
    const payload = buildOutageCreatePayload(BASE_FORM);
    expect(payload.affected_services).toEqual(["DNS", "VoIP", "RTP"]);
  });

  it("sends an empty service array rather than undefined when none entered", () => {
    const payload = buildOutageCreatePayload({
      ...BASE_FORM,
      affected_services: "  , , ",
    });
    expect(payload.affected_services).toEqual([]);
  });

  it("parses the subscriber count as a number", () => {
    expect(buildOutageCreatePayload(BASE_FORM).affected_subscribers).toBe(
      1200,
    );
  });

  it("omits optional fields the operator left blank", () => {
    const payload = buildOutageCreatePayload({
      ...BASE_FORM,
      site_id: "   ",
      assigned_to: "",
      affected_subscribers: "",
    });

    expect(payload.site_id).toBeUndefined();
    expect(payload.assigned_to).toBeUndefined();
    expect(payload.affected_subscribers).toBeUndefined();
  });

  it("drops a non-numeric subscriber count rather than sending NaN", () => {
    const payload = buildOutageCreatePayload({
      ...BASE_FORM,
      affected_subscribers: "many",
    });
    expect(payload.affected_subscribers).toBeUndefined();
  });

  it("passes severity and status through unchanged", () => {
    const payload = buildOutageCreatePayload({
      ...BASE_FORM,
      severity: "critical",
      status: "resolved",
    });
    expect(payload.severity).toBe("critical");
    expect(payload.status).toBe("resolved");
  });

  it("is stable across two submissions of the same form (no Date.now collision)", () => {
    expect(buildOutageCreatePayload(BASE_FORM)).toEqual(
      buildOutageCreatePayload(BASE_FORM),
    );
  });
});
