import { api } from "@/lib/api";
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

  const response = await api.get<Blob>("/outages/export", {
    params,
    responseType: "blob",
  });

  const mimeType = response.headers["content-type"] ?? (
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
  const url = URL.createObjectURL(blob);
  const filename = getFilenameFromDisposition(
    response.headers["content-disposition"],
    format,
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
};
