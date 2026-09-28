/** ApexChain Frontend Test Suite */
/**
 * Issue #597 — the webhooks page used literal key arrays (`["webhooks"]`,
 * `["webhook-deliveries", id]`) that could not be reached by the shared
 * `slaEventKeys` invalidation flow. These tests pin the factory shape the page
 * now builds from, plus the two properties that make migrating it worthwhile:
 *
 *  - every webhook key sits under the shared `sla-events` prefix, so
 *    `slaEventKeys.all` / `webhooks.all` invalidation reaches it, and
 *  - the new keys are *distinct* from the old literals, so a missed call site
 *    fails loudly instead of quietly invalidating a key nobody reads.
 */
import { describe, expect, it } from "vitest";

import { slaEventKeys } from "@/lib/query-keys";

describe("slaEventKeys.webhooks", () => {
  it("roots the webhook family under the shared sla-events prefix", () => {
    expect(slaEventKeys.webhooks.all).toEqual(["sla-events", "webhooks"]);
    expect([...slaEventKeys.webhooks.all].slice(0, slaEventKeys.all.length)).toEqual([
      ...slaEventKeys.all,
    ]);
  });

  it("separates the endpoint list from a single endpoint's deliveries", () => {
    expect(slaEventKeys.webhooks.list()).toEqual(["sla-events", "webhooks", "list", undefined]);
    expect(slaEventKeys.webhooks.list({ page: 2 })).toEqual([
      "sla-events",
      "webhooks",
      "list",
      { page: 2 },
    ]);
    expect(slaEventKeys.webhooks.deliveries("wh-1")).toEqual([
      "sla-events",
      "webhooks",
      "deliveries",
      "wh-1",
    ]);
    expect(slaEventKeys.webhooks.detail("wh-1")).toEqual(["sla-events", "webhooks", "wh-1"]);
  });

  it("makes webhooks.all a prefix of both read keys", () => {
    const root = [...slaEventKeys.webhooks.all];
    expect([...slaEventKeys.webhooks.list()].slice(0, root.length)).toEqual(root);
    expect([...slaEventKeys.webhooks.deliveries("wh-1")].slice(0, root.length)).toEqual(root);
  });

  it("does not reuse the literal keys the page used to read", () => {
    expect([...slaEventKeys.webhooks.list()]).not.toEqual(["webhooks"]);
    expect([...slaEventKeys.webhooks.deliveries("wh-1")]).not.toEqual([
      "webhook-deliveries",
      "wh-1",
    ]);
  });

  it("keeps two different webhooks' deliveries on distinct keys", () => {
    expect(slaEventKeys.webhooks.deliveries("wh-1")).not.toEqual(
      slaEventKeys.webhooks.deliveries("wh-2"),
    );
  });
});
