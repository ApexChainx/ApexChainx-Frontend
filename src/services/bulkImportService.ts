import axios from "axios";
import { BulkImportResult } from "../types/bulkImport";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export const bulkImportOutages = async (
  file: File
): Promise<BulkImportResult> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await axios.post<BulkImportResult>(
    `${API_BASE}/outages/bulk`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return response.data;
};
