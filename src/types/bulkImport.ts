/** ApexChain Network Operations Intelligence Platform */
export interface ImportValidationError {
  row?: number;
  field?: string;
  message: string;
}

/**
 * Issue #614 — the phases a bulk import moves through. The client observes
 * parsing/validating while the file is inspected, submitting while the
 * request body uploads, applying once the server has accepted the batch,
 * and done when the import result is in hand.
 */
export type BulkImportStage =
  | "parsing"
  | "validating"
  | "submitting"
  | "applying"
  | "done";

/**
 * Issue #614 — staged progress for a bulk import. `processed`/`total` are
 * in bytes while the request uploads (row counts are unknown to the
 * service, which uploads in one shot); `percent` is the overall completion
 * across all stages, monotonically increasing so the progress strip never
 * appears to move backwards.
 */
export interface BulkImportProgress {
  stage: BulkImportStage;
  processed: number;
  total: number;
  percent: number;
}

export interface BulkImportResult {
  imported: number;
  skipped: number;
  errors: ImportValidationError[];
}

export interface BulkImportRecord {
  id: string;
  filename: string;
  imported: number;
  skipped: number;
  error_count: number;
  errors: ImportValidationError[];
  created_at: string;
}
