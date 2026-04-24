export interface ImportValidationError {
  row?: number;
  field?: string;
  message: string;
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
