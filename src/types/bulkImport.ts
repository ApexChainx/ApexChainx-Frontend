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
