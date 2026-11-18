/** ApexChain Frontend Test Suite */
/**
 * Issue #907-#910 — lightweight validation for the reporting-related SLA
 * operations type modules. The modules are declaration-only, so these tests
 * construct representative values and assert their shape at runtime;
 * TypeScript validates the annotations during `npm run typecheck`.
 */
import { describe, expect, it } from "vitest";

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
