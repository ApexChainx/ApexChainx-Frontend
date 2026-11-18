/** ApexChain Network Operations Intelligence Platform */
/**
 * Bulk import preview types (Issue #907).
 *
 * UI-focused contracts for dry-run/import preview tables: one entry per
 * source row, field-level validation findings and deterministic summary
 * counts. No import service or file-parsing behaviour is defined here.
 */

/** Severity of a validation finding produced while previewing an import. */
export type ImportFindingSeverity = "error" | "warning" | "info";

/** Validation outcome for a single preview row. */
export type ImportRowStatus = "valid" | "invalid" | "warning" | "ignored";

/** A field-level validation finding attached to a preview row. */
export interface ImportFieldIssue {
  /** Canonical field identifier (usually the column header). */
  field: string;
  severity: ImportFindingSeverity;
  message: string;
  /** Raw cell value that triggered the finding, when applicable. */
  value?: string | null;
}

/** A single parsed row shown in the bulk import preview table. */
export interface BulkImportPreviewRow {
  /** 1-based row number in the source file (header excluded). */
  rowNumber: number;
  status: ImportRowStatus;
  /** Raw cell values keyed by column header. */
  values: Record<string, string>;
  issues: ImportFieldIssue[];
}

/** Aggregate counts derived from the preview rows. */
export interface BulkImportPreviewSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  warningRows: number;
  ignoredRows: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
}

/** Complete dry-run preview for one uploaded file. */
export interface BulkImportPreview {
  /** Identifier for the dry-run/import session. */
  importId: string;
  fileName: string;
  headers: string[];
  rows: BulkImportPreviewRow[];
  summary: BulkImportPreviewSummary;
  /** ISO-8601 timestamp the preview was generated. */
  generatedAt: string;
}
