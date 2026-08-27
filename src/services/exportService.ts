/** ApexChain Network Operations Intelligence Platform */
import { api } from "@/lib/api";
import { assertDownloadableBlob, downloadBlob } from "@/lib/download";
import { ENDPOINTS } from "@/lib/endpoints";
import { ExportFormat, OutageExportFilters } from "../types/export";

function getFilenameFromDisposition(
  dispositionHeader: string | undefined,
  fallbackFormat: ExportFormat,
) {
  const match = dispositionHeader?.match(/filename="?([^"]+)"?/i);
  if (match?.[1]) {
    return match[1];
  }

  return `outages_export_${new Date().toISOString().slice(0, 10)}.${fallbackFormat}`;
}

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

  const response = await api.get<Blob>(ENDPOINTS.outages.export, {
    params,
    responseType: "blob",
  });

  const rawContentType = response.headers["content-type"];
  const mimeType = (typeof rawContentType === "string" ? rawContentType : undefined) ?? (
    format === "csv" ? "text/csv" : "application/json"
  );
  const blob =
    response.data instanceof Blob
      ? response.data
      : new Blob(
          [
            typeof response.data === "string"
              ? response.data
              : JSON.stringify(response.data, null, format === "json" ? 2 : undefined),
          ],
          { type: mimeType },
        );
  const safeBlob = await assertDownloadableBlob(blob);
  const filename = getFilenameFromDisposition(
    response.headers["content-disposition"],
    format,
  );
  downloadBlob(safeBlob, filename);
};
