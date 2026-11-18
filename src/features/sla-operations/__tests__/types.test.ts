/** ApexChain Frontend Test Suite */
/**
 * Issue #911-#914 — lightweight validation for the KPI, annotation, export
 * and health-indicator type modules. The modules are declaration-only, so
 * these tests construct representative values and assert their shape at
 * runtime; TypeScript validates the annotations during `npm run typecheck`.
 */
import { describe, expect, it } from "vitest";

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
