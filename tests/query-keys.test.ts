/**
 * ApexChain Frontend Test Suite
 *
 * Issue #623 — pin the exact shape of every factory branch. These assertions
 * are the contract readers and invalidators rely on: if a key stops sharing
 * the "sla-events" prefix, prefix-matching invalidation silently stops
 * reaching it (see docs/query-keys.md).
 */
import { describe, expect, it } from "vitest";

import { sessionKeys, slaEventKeys } from "@/lib/query-keys";

describe("slaEventKeys factory (issue #623)", () => {
  it("exposes the shared root", () => {
    expect(slaEventKeys.all).toEqual(["sla-events"]);
  });

  it("builds dashboard keys", () => {
    expect(slaEventKeys.dashboard()).toEqual(["sla-events", "dashboard", undefined]);
    expect(slaEventKeys.dashboard({ severity: "high" })).toEqual([
      "sla-events",
      "dashboard",
      { severity: "high" },
    ]);
  });

  it("builds dashboard comparison keys", () => {
    expect(slaEventKeys.dashboardCompare()).toEqual([
      "sla-events",
      "dashboard-compare",
      undefined,
    ]);
    expect(slaEventKeys.dashboardCompare({ date_from: "2026-08-01" })).toEqual([
      "sla-events",
      "dashboard-compare",
      { date_from: "2026-08-01" },
    ]);
  });

  it("builds SLA calculation keys", () => {
    expect(slaEventKeys.sla.all).toEqual(["sla-events", "sla"]);
    expect(slaEventKeys.sla.calculate()).toEqual(["sla-events", "sla", "calculate", undefined]);
    expect(slaEventKeys.sla.calculate({ outage_id: "o1" })).toEqual([
      "sla-events",
      "sla",
      "calculate",
      { outage_id: "o1" },
    ]);
    expect(slaEventKeys.sla.preview()).toEqual(["sla-events", "sla", "preview", undefined]);
    expect(slaEventKeys.sla.preview({ severity: "high" })).toEqual([
      "sla-events",
      "sla",
      "preview",
      { severity: "high" },
    ]);
  });

  it("builds outage keys", () => {
    expect(slaEventKeys.outages.all).toEqual(["sla-events", "outages"]);
    expect(slaEventKeys.outages.lists).toEqual(["sla-events", "outages", "list"]);
    expect(slaEventKeys.outages.list()).toEqual(["sla-events", "outages", "list", undefined]);
    expect(slaEventKeys.outages.list({ status: "open" })).toEqual([
      "sla-events",
      "outages",
      "list",
      { status: "open" },
    ]);
    expect(slaEventKeys.outages.detail("OUT-1")).toEqual(["sla-events", "outages", "OUT-1"]);
  });

  it("builds payment keys", () => {
    expect(slaEventKeys.payments.all).toEqual(["sla-events", "payments"]);
    expect(slaEventKeys.payments.list()).toEqual(["sla-events", "payments", "list", undefined]);
    expect(slaEventKeys.payments.list({ page: 2 })).toEqual([
      "sla-events",
      "payments",
      "list",
      { page: 2 },
    ]);
    expect(slaEventKeys.payments.detail("PAY-1")).toEqual(["sla-events", "payments", "PAY-1"]);
  });

  it("builds dispute keys", () => {
    expect(slaEventKeys.disputes.all).toEqual(["sla-events", "disputes"]);
    expect(slaEventKeys.disputes.list()).toEqual(["sla-events", "disputes", "list", undefined]);
    expect(
      slaEventKeys.disputes.list({ outage_id: "OUT-1", status: "open", page: 1 }),
    ).toEqual(["sla-events", "disputes", "list", { outage_id: "OUT-1", status: "open", page: 1 }]);
    expect(slaEventKeys.disputes.detail("DIS-1")).toEqual(["sla-events", "disputes", "DIS-1"]);
  });

  it("builds the SLA config key", () => {
    expect(slaEventKeys.config).toEqual(["sla-events", "config"]);
  });

  it("builds webhook keys", () => {
    expect(slaEventKeys.webhooks.all).toEqual(["sla-events", "webhooks"]);
    expect(slaEventKeys.webhooks.list()).toEqual(["sla-events", "webhooks", "list", undefined]);
    expect(slaEventKeys.webhooks.list({ webhook_id: "WH-1" })).toEqual([
      "sla-events",
      "webhooks",
      "list",
      { webhook_id: "WH-1" },
    ]);
    expect(slaEventKeys.webhooks.detail("WH-1")).toEqual(["sla-events", "webhooks", "WH-1"]);
  });

  it("builds bulk import keys", () => {
    expect(slaEventKeys.bulkImports.all).toEqual(["sla-events", "bulk-imports"]);
    expect(slaEventKeys.bulkImports.list()).toEqual([
      "sla-events",
      "bulk-imports",
      "list",
      undefined,
    ]);
    expect(slaEventKeys.bulkImports.list({ page: 1 })).toEqual([
      "sla-events",
      "bulk-imports",
      "list",
      { page: 1 },
    ]);
  });

  it("roots every slaEventKeys branch under the shared prefix", () => {
    const keys: ReadonlyArray<readonly unknown[]> = [
      slaEventKeys.all,
      slaEventKeys.dashboard(),
      slaEventKeys.dashboardCompare(),
      slaEventKeys.sla.all,
      slaEventKeys.sla.calculate(),
      slaEventKeys.sla.preview(),
      slaEventKeys.outages.all,
      slaEventKeys.outages.lists,
      slaEventKeys.outages.list(),
      slaEventKeys.outages.detail("x"),
      slaEventKeys.payments.all,
      slaEventKeys.payments.list(),
      slaEventKeys.payments.detail("x"),
      slaEventKeys.disputes.all,
      slaEventKeys.disputes.list(),
      slaEventKeys.disputes.detail("x"),
      slaEventKeys.config,
      slaEventKeys.webhooks.all,
      slaEventKeys.webhooks.list(),
      slaEventKeys.webhooks.detail("x"),
      slaEventKeys.bulkImports.all,
      slaEventKeys.bulkImports.list(),
      slaEventKeys.stellarHealth,
    ];
    for (const key of keys) {
      expect(key[0]).toBe("sla-events");
    }
  });
});

describe("sessionKeys factory (issue #623)", () => {
  it("exposes the session root", () => {
    expect(sessionKeys.all).toEqual(["session"]);
  });

  it("builds the current-user key", () => {
    expect(sessionKeys.me).toEqual(["session", "me"]);
  });

  it("builds the two-factor key", () => {
    expect(sessionKeys.twoFactor).toEqual(["session", "two-factor"]);
  });
});
