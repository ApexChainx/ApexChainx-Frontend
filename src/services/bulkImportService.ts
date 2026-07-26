/** ApexChain Network Operations Intelligence Platform */
import { AxiosProgressEvent, AxiosRequestConfig } from "axios";

import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

import type {
  BulkImportRecord,
  BulkImportResult,
} from "@/types/bulkImport";

const BULK_IMPORT_ENDPOINT = ENDPOINTS.outages.bulk;
const BULK_IMPORT_HISTORY_ENDPOINT = ENDPOINTS.outages.bulkHistory;

const MAGIC_BYTES: Record<string, number[]> = {
  "text/csv": [0xEF, 0xBB, 0xBF], // UTF-8 BOM (optional for CSV)
  "application/json": [0x7B], // {
  "text/plain": [], // No magic bytes requirement
};

interface BulkImportOptions {
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
}

interface APIError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

function createFormData(file: File): FormData {
  const formData = new FormData();

  formData.append("file", file);

  return formData;
}

function calculateProgress(event: AxiosProgressEvent): number {
  if (!event.total) {
    return 0;
  }

  return Math.min(
    100,
    Math.round((event.loaded * 100) / event.total)
  );
}

function extractErrorMessage(error: unknown): string {
  const apiError = error as APIError;

  return (
    apiError.response?.data?.message ||
    apiError.message ||
    "Something went wrong during bulk import."
  );
}

function buildUploadConfig(
  options?: BulkImportOptions
): AxiosRequestConfig<FormData> {
  return {
    headers: {
      "Content-Type": "multipart/form-data",
    },

    signal: options?.signal,

    onUploadProgress: options?.onProgress
      ? (event: AxiosProgressEvent) => {
          options.onProgress?.(calculateProgress(event));
        }
      : undefined,
  };
}

/**
 * Validate file magic bytes against declared MIME type.
 * Returns true if valid, throws if suspicious.
 */
async function validateMagicBytes(file: File): Promise<void> {
  const slice = file.slice(0, 8);
  const buffer = await slice.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (file.type === "application/json") {
    // JSON must start with { or [
    const firstNonWhitespace = Array.from(bytes).find((b) => b !== 0x20 && b !== 0x09 && b !== 0x0A && b !== 0x0D);
    if (firstNonWhitespace !== undefined && firstNonWhitespace !== 0x7B && firstNonWhitespace !== 0x5B) {
      throw new Error("File content does not match JSON format. Please upload a valid JSON file.");
    }
  }

  if (file.type === "text/csv" || file.name.endsWith(".csv")) {
    // CSV shouldn't start with binary null bytes
    const hasNullBytes = Array.from(bytes).some((b) => b === 0x00);
    if (hasNullBytes) {
      throw new Error("File appears to contain binary data. Please upload a valid CSV file.");
    }
  }
}

/**
 * Upload outages file for bulk import.
 */
export async function bulkImportOutages(
  file: File,
  options?: BulkImportOptions
): Promise<BulkImportResult> {
  if (!file) {
    throw new Error("No file provided for upload.");
  }

  await validateMagicBytes(file);

  try {
    const formData = createFormData(file);

    const response = await api.post<BulkImportResult>(
      BULK_IMPORT_ENDPOINT,
      formData,
      buildUploadConfig(options)
    );

    return response.data;
  } catch (error: unknown) {
    if ((error as { name?: string }).name === "CanceledError") {
      throw error;
    }

    throw new Error(extractErrorMessage(error));
  }
}

/**
 * Fetch bulk import history records.
 */
export async function fetchBulkImportHistory(): Promise<
  BulkImportRecord[]
> {
  try {
    const response = await api.get<BulkImportRecord[]>(
      BULK_IMPORT_HISTORY_ENDPOINT
    );

    return response.data;
  } catch (error: unknown) {
    throw new Error(extractErrorMessage(error));
  }
}

/**
 * Optional helper for downloading failed import reports.
 */
export function downloadImportErrorsCSV(
  errors: Array<{
    row?: number;
    field?: string;
    message: string;
  }>,
  filename = `bulk-import-errors-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`
): void {
  const rows = [
    ["row", "field", "message"],

    ...errors.map((error) => [
      error.row != null ? String(error.row) : "",
      error.field ?? "",
      error.message,
    ]),
  ];

  const csv = rows
    .map((row) =>
      row
        .map((cell) => `"${cell.replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}