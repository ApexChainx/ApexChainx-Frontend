export type ExportFormat = "csv" | "json";

export interface OutageExportFilters {
  status?: string;
  start_date?: string;
  end_date?: string;
  severity?: string;
  [key: string]: string | undefined;
}
