import { api } from "@/lib/api";
import { BulkImportResult, BulkImportRecord } from "../types/bulkImport";

export const bulkImportOutages = async (
  file: File
): Promise<BulkImportResult> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post<BulkImportResult>(
    "/outages/bulk",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return response.data;
};

export const fetchBulkImportHistory = async (): Promise<BulkImportRecord[]> => {
  const response = await api.get<BulkImportRecord[]>("/outages/bulk/history");
  return response.data;
};
