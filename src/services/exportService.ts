/** ApexChain Network Operations Intelligence Platform */
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import { ExportFormat, OutageExportFilters } from "../types/export";

// RFC 5987 `filename*=` form: [charset''][language'']percent-encoded-value.
// The charset/language segments are optional; only the value is kept.
const RFC_5987_FILENAME_STAR_REGEX =
  /filename\*\s*=\s*(?:[\w!#$%&+^_`{}~-]+''|'')?([^;\s]+)/i;
const FILENAME_PARAM_REGEX = /filename\s*=\s*/i;

function decodeExtendedFilename(rawValue: string): string {
  const separatorIndex = rawValue.indexOf("''");
  const encoded = separatorIndex >= 0 ? rawValue.slice(separatorIndex + 2) : rawValue;
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
}

/**
 * Extract the raw value following a legacy `filename=` parameter.
 *
 * Handles quoted values spanning semicolons and containing backslash-escaped
 * characters; returns `undefined` for missing, empty, or unterminated values.
 */
function extractFilenameParamValue(dispositionHeader: string): string | undefined {
  const paramMatch = dispositionHeader.match(FILENAME_PARAM_REGEX);
  if (!paramMatch || paramMatch.index === undefined) {
    return undefined;
  }

  const rest = dispositionHeader.slice(paramMatch.index + paramMatch[0].length);
  if (rest.startsWith('"')) {
    let index = 1;
    while (index < rest.length) {
      const char = rest[index];
      if (char === "\\") {
        index += 2;
        continue;
      }
      if (char === '"') {
        return rest.slice(0, index + 1);
      }
      index += 1;
    }
    return undefined; // unterminated quoted value
  }

  const semicolonIndex = rest.indexOf(";");
  const token = semicolonIndex === -1 ? rest : rest.slice(0, semicolonIndex);
  const trimmed = token.trim();
  return trimmed.length > 0 ? trimmed : undefined;
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

  const starMatch = dispositionHeader.match(RFC_5987_FILENAME_STAR_REGEX);
  if (starMatch?.[1]) {
    return decodeExtendedFilename(starMatch[1]);
  }

  const rawValue = extractFilenameParamValue(dispositionHeader);
  if (!rawValue) {
    return null;
  }

  if (rawValue.startsWith('"')) {
    // extractFilenameParamValue only returns quoted tokens it terminated.
    const innerValue = rawValue.slice(1, -1);
    if (innerValue.length === 0) {
      return null; // empty quoted filename carries no usable name
    }
    return innerValue.replace(/\\(.)/g, "$1");
  }

  return rawValue;
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
