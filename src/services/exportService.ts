import { api } from "@/lib/api";
import { ExportFormat, OutageExportFilters } from "../types/export";

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

  const response = await api.get<Blob>("/outages/export", {
    params,
    responseType: "blob",
  });

  const mimeType = format === "csv" ? "text/csv" : "application/json";
  const blob = response.data instanceof Blob
    ? response.data
    : new Blob([response.data], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const filename = `outages_export_${new Date().toISOString().slice(0, 10)}.${format}`;
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
};
