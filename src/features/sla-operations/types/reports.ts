/** ApexChain Network Operations Intelligence Platform */
/**
 * Operations report types (Issue #910).
 *
 * Shapes for generated/exportable SLA operations reports. Reports are
 * composed from a discriminated union of sections so renderers can switch
 * exhaustively, and the export payloads describe both JSON and CSV
 * representations without performing any serialization here.
 */

/** Serialization format of an exportable report. */
export type ReportFormat = "json" | "csv";

/** Discriminant for the kinds of sections a report may contain. */
export type ReportSectionKind = "summary" | "table" | "text";

/** Descriptive metadata attached to every generated report. */
export interface ReportMetadata {
  id: string;
  title: string;
  /** ISO-8601 timestamp the report was generated. */
  generatedAt: string;
  /** Inclusive start of the reporting period (ISO date string). */
  periodStart: string;
  /** Inclusive end of the reporting period (ISO date string). */
  periodEnd: string;
  generatedBy?: string | undefined;
  format: ReportFormat;
}

/** One row of a tabular report section. */
export interface ReportTableRow {
  /** Ordered cell values, aligned with the section's `columns`. */
  cells: string[];
}

/** A tabular section, e.g. a list of outages or settlements. */
export interface ReportTableSection {
  kind: "table";
  id: string;
  title: string;
  columns: string[];
  rows: ReportTableRow[];
}

/** A label/value section used for headline KPIs. */
export interface ReportSummarySection {
  kind: "summary";
  id: string;
  title: string;
  entries: { label: string; value: string }[];
}

/** A free-text narrative section. */
export interface ReportTextSection {
  kind: "text";
  id: string;
  title: string;
  body: string;
}

/** Any section that can appear in an operations report. */
export type ReportSection =
  | ReportTableSection
  | ReportSummarySection
  | ReportTextSection;

/** In-memory representation of a generated report. */
export interface OperationsReport {
  metadata: ReportMetadata;
  sections: ReportSection[];
}

/** Export-ready JSON payload. */
export interface JsonReportPayload {
  format: "json";
  report: OperationsReport;
}

/** Export-ready CSV payload for a single tabular section. */
export interface CsvReportPayload {
  format: "csv";
  fileName: string;
  /** Serialized CSV content, ready to be written to a blob. */
  content: string;
}

/** Union of the supported export-ready report payloads. */
export type ExportableReportPayload = JsonReportPayload | CsvReportPayload;
