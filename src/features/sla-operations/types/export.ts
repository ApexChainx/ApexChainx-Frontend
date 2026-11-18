/** ApexChain Network Operations Intelligence Platform */
/**
 * Export configuration types (Issue #913).
 *
 * Types for export options, field selection, range/scope and generated file
 * metadata in SLA operations tools. These are intentionally independent of
 * core export services: they describe operator intent and the resulting file
 * descriptor only.
 */

/** Serialization format requested for an export. */
export type ExportFormat = "csv" | "json";

/** Which rows an export should include. */
export type ExportScope = "all" | "filtered" | "selected";

/** Field selection for an export, in output order. */
export interface ExportFieldSelection {
  /** Canonical field identifiers to include. */
  fields: string[];
  /** Optional human-readable headers keyed by field id. */
  headers?: Record<string, string> | undefined;
}

/** Inclusive date range restricting exported rows. */
export interface ExportRange {
  from?: string | undefined;
  to?: string | undefined;
}

/** Fully specified export options produced by an export form. */
export interface ExportOptions {
  format: ExportFormat;
  scope: ExportScope;
  selection: ExportFieldSelection;
  range: ExportRange;
  /** Row identifiers, required when `scope` is "selected". */
  selectedIds?: string[] | undefined;
  /** Include a header row for CSV exports. Defaults to true in consumers. */
  includeHeader?: boolean | undefined;
}

/** Descriptor for a generated export file. */
export interface GeneratedExportFile {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  /** ISO-8601 timestamp the file was generated. */
  generatedAt: string;
  rowCount: number;
}

/** Result of validating export options before submission. */
export interface ExportValidationResult {
  valid: boolean;
  errors: string[];
}
