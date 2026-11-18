/** ApexChain Frontend Test Suite */

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

import type {
  BulkImportPreview,
  BulkImportPreviewRow,
} from "@/features/sla-operations/types/bulk-import-preview";

import type {
  FilterSelection,
  OperationsFilterState,
  SortDescriptor,
} from "@/features/sla-operations/types/filters";

import type {
  TimelineActor,
  TimelineEvent,
  TimelineGroup,
} from "@/features/sla-operations/types/timeline";

import type {
  CsvReportPayload,
  JsonReportPayload,
  OperationsReport,
  ReportTableSection,
} from "@/features/sla-operations/types/reports";

import type {
  KpiCardModel,
  KpiDelta,
} from "@/features/sla-operations/types/kpi";

import type {
  Annotation,
  AnnotationEditValues,
  AnnotationFormValues,
} from "@/features/sla-operations/types/annotations";

import type {
  ExportOptions,
  GeneratedExportFile,
} from "@/features/sla-operations/types/export";

import type {
  HealthAggregate,
  HealthBadgeModel,
  HealthIndicator,
} from "@/features/sla-operations/types/health-indicators";

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

describe("SLA operations reporting types (#907-#910)", () => {
  it("models a bulk import preview with field-level findings", () => {
    const row: BulkImportPreviewRow = {
      rowNumber: 2,
      status: "invalid",
      values: { site_id: "", severity: "urgent" },
      issues: [
        { field: "site_id", severity: "error", message: "Required" },
        {
          field: "severity",
          severity: "warning",
          message: "Unrecognised value",
          value: "urgent",
        },
      ],
    };
    const preview: BulkImportPreview = {
      importId: "imp-1",
      fileName: "outages.csv",
      headers: ["site_id", "severity"],
      rows: [row],
      summary: {
        totalRows: 1,
        validRows: 0,
        invalidRows: 1,
        warningRows: 0,
        ignoredRows: 0,
        errorCount: 1,
        warningCount: 1,
        infoCount: 0,
      },
      generatedAt: "2026-01-01T00:00:00.000Z",
    };

    expect(preview.rows[0]?.issues).toHaveLength(2);
    expect(preview.summary.errorCount).toBe(1);
  });

  it("models filter state, sort descriptors and selections", () => {
    const sort: SortDescriptor<"detected_at"> = {
      field: "detected_at",
      direction: "desc",
    };
    const state: OperationsFilterState = {
      search: "lagos",
      dateRange: { from: "2026-01-01", to: "2026-01-31" },
      severities: ["high"],
      statuses: ["open"],
      sort,
    };
    const selection: FilterSelection = { kind: "include", values: ["high"] };

    expect(state.sort?.direction).toBe("desc");
    expect(state.dateRange.from).toBe("2026-01-01");
    expect(selection.kind).toBe("include");
  });

  it("models timeline events and grouped buckets", () => {
    const actor: TimelineActor = {
      kind: "operator",
      id: "user-1",
      label: "Fatima",
    };
    const event: TimelineEvent = {
      id: "evt-1",
      category: "outage",
      title: "Outage detected",
      timestamp: "2026-01-01T00:00:00.000Z",
      actor,
      referenceId: "out-1",
    };
    const group: TimelineGroup = {
      id: "grp-1",
      label: "1 January 2026",
      bucket: "2026-01-01",
      events: [event],
    };

    expect(group.events[0]?.actor?.label).toBe("Fatima");
    expect(group.bucket).toBe("2026-01-01");
  });

  it("models report metadata, sections and export payloads", () => {
    const table: ReportTableSection = {
      kind: "table",
      id: "outages",
      title: "Outages",
      columns: ["ID", "Site"],
      rows: [{ cells: ["out-1", "Lagos"] }],
    };
    const report: OperationsReport = {
      metadata: {
        id: "rep-1",
        title: "Monthly SLA report",
        generatedAt: "2026-02-01T00:00:00.000Z",
        periodStart: "2026-01-01",
        periodEnd: "2026-01-31",
        format: "json",
      },
      sections: [table],
    };
    const jsonPayload: JsonReportPayload = { format: "json", report };
    const csvPayload: CsvReportPayload = {
      format: "csv",
      fileName: "report.csv",
      content: "ID,Site\nout-1,Lagos\n",
    };

    expect(jsonPayload.report.sections[0]?.kind).toBe("table");
    expect(csvPayload.content).toContain("out-1");
  });
});

describe("SLA operations presentation types (#911-#914)", () => {
  it("models KPI cards and deltas", () => {
    const delta: KpiDelta = {
      value: 1.2,
      direction: "up",
      comparisonLabel: "vs previous period",
    };
    const card: KpiCardModel = {
      id: "compliance",
      label: "SLA compliance",
      variant: "percentage",
      displayValue: "99.5%",
      rawValue: 99.5,
      delta,
      state: "positive",
    };

    expect(card.displayValue).toBe("99.5%");
    expect(card.delta?.direction).toBe("up");
  });

  it("models annotations, form values and edits", () => {
    const form: AnnotationFormValues = {
      body: "Root cause identified",
      category: "cause",
      visibility: "internal",
      targetType: "outage",
      targetId: "out-1",
    };
    const annotation: Annotation = {
      id: "ann-1",
      ...form,
      author: { id: "user-1", displayName: "Fatima" },
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: null,
    };
    const edit: AnnotationEditValues = {
      body: "Root cause confirmed",
      category: "cause",
      visibility: "public",
    };

    expect(annotation.targetType).toBe("outage");
    expect(annotation.author.displayName).toBe("Fatima");
    expect(edit.visibility).toBe("public");
  });

  it("models export options and generated file metadata", () => {
    const options: ExportOptions = {
      format: "csv",
      scope: "selected",
      selection: {
        fields: ["id", "site_name"],
        headers: { id: "ID", site_name: "Site" },
      },
      range: { from: "2026-01-01" },
      selectedIds: ["out-1"],
      includeHeader: true,
    };
    const file: GeneratedExportFile = {
      fileName: "outages.csv",
      mimeType: "text/csv",
      sizeBytes: 128,
      generatedAt: "2026-02-01T00:00:00.000Z",
      rowCount: 1,
    };

    expect(options.selection.fields).toHaveLength(2);
    expect(file.mimeType).toBe("text/csv");
  });

  it("models health indicators, aggregates and badges", () => {
    const indicator: HealthIndicator = {
      id: "webhook-health",
      label: "Webhook delivery",
      level: "degraded",
      source: "webhooks",
      message: "Two consecutive failures",
      observedAt: "2026-01-01T00:00:00.000Z",
      ageSeconds: 45,
      stale: false,
    };
    const aggregate: HealthAggregate = {
      overall: "degraded",
      indicators: [indicator],
      counts: { healthy: 0, degraded: 1, critical: 0, unknown: 0 },
      updatedAt: "2026-01-01T00:00:45.000Z",
    };
    const badge: HealthBadgeModel = {
      level: indicator.level,
      label: "Degraded",
      tone: "warning",
    };

    expect(aggregate.counts.degraded).toBe(1);
    expect(badge.tone).toBe("warning");
  });
});
