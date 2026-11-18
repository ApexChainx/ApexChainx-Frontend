/** ApexChain Frontend Test Suite */
/**
 * Issue #903-#906 — lightweight validation for the SLA operations domain
 * type modules. The modules are declaration-only, so these tests construct
 * representative values and assert their shape at runtime; TypeScript itself
 * validates the annotations when `npm run typecheck` runs.
 */
import { describe, expect, it } from "vitest";

import type {
  ComplianceSnapshot,
  SlaKpiSummary,
  SlaTrendPoint,
  ThresholdDelta,
} from "@/features/sla-operations/types/sla-metrics";
import type {
  OutageAnnotationPayload,
  OutageFilterState,
  OutageRow,
  OutageTimelineEntry,
} from "@/features/sla-operations/types/outage-operations";
import type {
  SettlementDisplayState,
  SettlementLineItem,
  SettlementSummary,
} from "@/features/sla-operations/types/settlement-summary";
import type {
  WebhookDeliveryAttempt,
  WebhookEndpointHealth,
  WebhookEventFeedItem,
} from "@/features/sla-operations/types/webhook-monitoring";

describe("SLA operations domain types (#903-#906)", () => {
  it("models a complete SLA KPI summary", () => {
    const point: SlaTrendPoint = {
      timestamp: "2026-01-01T00:00:00.000Z",
      value: 99.5,
      label: "Jan",
    };
    const snapshot: ComplianceSnapshot = {
      timestamp: "2026-01-01T00:00:00.000Z",
      complianceRate: 99.5,
      evaluatedCount: 200,
      violatedCount: 1,
    };
    const delta: ThresholdDelta = {
      metric: "mttr_minutes",
      threshold: 30,
      observed: 24,
      delta: -6,
      withinThreshold: true,
    };
    const summary: SlaKpiSummary = {
      totalEvaluated: 200,
      totalMet: 199,
      violationCount: 1,
      mttrMinutes: 24,
      mttrThresholdMinutes: 30,
      complianceRate: 99.5,
      netSettlement: { amount: 120, currency: "USD" },
      totalRewards: { amount: 150, currency: "USD" },
      totalPenalties: { amount: 30, currency: "USD" },
      complianceTrend: [point],
      latestSnapshot: snapshot,
      thresholdDeltas: [delta],
    };

    expect(summary.complianceTrend[0]?.value).toBe(99.5);
    expect(summary.latestSnapshot?.violatedCount).toBe(1);
    expect(summary.thresholdDeltas[0]?.withinThreshold).toBe(true);
  });

  it("models outage rows, filters, timeline entries and annotations", () => {
    const row: OutageRow = {
      id: "out-1",
      siteName: "Lagos Node 1",
      siteId: "site-lagos-1",
      severity: "critical",
      status: "mitigating",
      detectedAt: "2026-01-01T00:00:00.000Z",
      mttrMinutes: null,
      affectedSubscribers: 1200,
      affectedServices: ["dns", "voip"],
      assignedTo: null,
    };
    const filter: OutageFilterState = {
      search: "lagos",
      severities: ["high", "critical"],
      statuses: ["open"],
    };
    const entry: OutageTimelineEntry = {
      id: "evt-1",
      kind: "status-change",
      timestamp: "2026-01-01T01:00:00.000Z",
      previousStatus: "open",
      nextStatus: "mitigating",
      message: "Escalated",
    };
    const payload: OutageAnnotationPayload = {
      outageId: row.id,
      body: "Upstream provider notified",
      category: "note",
    };

    expect(row.affectedServices).toContain("dns");
    expect(filter.severities).toHaveLength(2);
    expect(entry.nextStatus).toBe("mitigating");
    expect(payload.outageId).toBe("out-1");
  });

  it("models settlement summaries and display state", () => {
    const lineItem: SettlementLineItem = {
      id: "li-1",
      kind: "reward",
      label: "SLA met",
      amount: 150,
      currency: "USD",
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    const summary: SettlementSummary = {
      id: "set-1",
      periodStart: "2026-01-01",
      periodEnd: "2026-01-31",
      status: "ready",
      currency: "USD",
      rewardTotal: 150,
      penaltyTotal: 30,
      netAmount: 120,
      lineItems: [lineItem],
    };
    const display: SettlementDisplayState = {
      summary,
      isStale: false,
      hasDisputes: false,
    };

    expect(display.summary.netAmount).toBe(120);
    expect(display.summary.lineItems[0]?.kind).toBe("reward");
  });

  it("models webhook health, delivery attempts and feed items", () => {
    const health: WebhookEndpointHealth = {
      endpointId: "ep-1",
      url: "https://example.test/hook",
      status: "degraded",
      consecutiveFailures: 2,
      lastCheckedAt: "2026-01-01T00:00:00.000Z",
      successRate: 80,
    };
    const attempt: WebhookDeliveryAttempt = {
      id: "del-1",
      endpointId: health.endpointId,
      eventType: "outage.resolved",
      status: "retrying",
      attemptedAt: "2026-01-01T00:00:00.000Z",
      retry: { attempt: 2, maxAttempts: 5 },
    };
    const feedItem: WebhookEventFeedItem = {
      id: "feed-1",
      kind: "retry",
      timestamp: attempt.attemptedAt,
      title: "Delivery retried",
      endpointId: health.endpointId,
      deliveryId: attempt.id,
    };

    expect(health.status).toBe("degraded");
    expect(attempt.retry.maxAttempts).toBe(5);
    expect(feedItem.deliveryId).toBe("del-1");
  });
});
