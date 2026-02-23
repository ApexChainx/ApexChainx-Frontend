import axios from "axios";
import { ExportFormat, OutageExportFilters } from "../types/export";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export const exportOutages = async (
  format: ExportFormat,
  filters: OutageExportFilters = {}
): Promise<void> => {
  const params: Record<string, string> = { format };

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      params[key] = value;
    }
  });

  const response = await axios.get(`${API_BASE}/outages/export`, {
    params,
    responseType: "blob",
  });

  const mimeType = format === "csv" ? "text/csv" : "application/json";
  const blob = new Blob([response.data], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const filename = `outages_export_${new Date().toISOString().slice(0, 10)}.${format}`;
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
};
