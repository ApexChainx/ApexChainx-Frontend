import { api } from "@/lib/api";
import { BulkImportResult, BulkImportRecord } from "../types/bulkImport";

export const bulkImportOutages = async (
  file: File,
  options?: { signal?: AbortSignal; onProgress?: (pct: number) => void }
): Promise<BulkImportResult> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post<BulkImportResult>("/outages/bulk", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    signal: options?.signal,
    onUploadProgress: options?.onProgress
      ? (e: { loaded: number; total?: number }) => {
          const pct = e.total ? Math.round((e.loaded / e.total) * 100) : 0;
          options.onProgress!(pct);
        }
      : undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  return response.data;
};

export const fetchBulkImportHistory = async (): Promise<BulkImportRecord[]> => {
  const response = await api.get<BulkImportRecord[]>("/outages/bulk/history");
  return response.data;
};
