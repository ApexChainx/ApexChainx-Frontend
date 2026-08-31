/** ApexChain Network Operations Intelligence Platform */
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import { ExportFormat, OutageExportFilters } from "../types/export";

function decodeRfc5987(value: string): string {
  // filename*=UTF-8''<percent-encoded>
  const eq = value.indexOf("''");
  const encoded = eq >= 0 ? value.slice(eq + 2) : value;
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
}

/**
 * Parse a Content-Disposition header into a filename.
 *
 * Prefers the RFC 5987 `filename*=` form (percent-decoded), falls back to
 * the legacy `filename=` form, and returns `null` when neither is present.
 */
export function getFilenameFromDisposition(
  dispositionHeader: string | undefined,
): string | null {
  if (!dispositionHeader) return null;

  const starMatch = dispositionHeader.match(/filename\*\s*=\s*(?:UTF-8'')?([^;\s]+)/i);
  if (starMatch?.[1]) {
    return decodeRfc5987(starMatch[1]);
  }

  const plainMatch = dispositionHeader.match(/filename\s*=\s*"?([^";\s]+)"?/i);
  if (plainMatch?.[1]) {
    return plainMatch[1];
  }

  return null;
}

function resolveExportFilename(dispositionHeader: string | undefined, fallbackFormat: ExportFormat): string {
  const parsed = getFilenameFromDisposition(dispositionHeader);
  if (parsed) {
    return parsed;
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
  const url = URL.createObjectURL(blob);
  const filename = resolveExportFilename(
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
