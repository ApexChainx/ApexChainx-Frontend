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

// Disallowed byte-order marks for CSV: UTF-16/UTF-32 BOMs mean the file is not
// plain UTF-8 text (the backend parses UTF-8). The optional UTF-8 BOM (EF BB BF)
// is intentionally absent so valid UTF-8 CSVs keep passing.
const DISALLOWED_CSV_BOMS = [
  [0xff, 0xfe, 0x00, 0x00], // UTF-32 LE
  [0x00, 0x00, 0xfe, 0xff], // UTF-32 BE
  [0xff, 0xfe], // UTF-16 LE
  [0xfe, 0xff], // UTF-16 BE
] as const;

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
  const config: AxiosRequestConfig<FormData> = {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  };

  if (options?.signal) {
    config.signal = options.signal;
  }

  if (options?.onProgress) {
    config.onUploadProgress = (event: AxiosProgressEvent) => {
      options.onProgress?.(calculateProgress(event));
    };
  }

  return config;
}

function isWhitespace(byte: number): boolean {
  return byte === 0x20 || byte === 0x09 || byte === 0x0a || byte === 0x0d;
}

function startsWith(bytes: Uint8Array, prefix: readonly number[]): boolean {
  if (bytes.length < prefix.length) {
    return false;
  }
  return prefix.every((value, index) => bytes[index] === value);
}

function hasDisallowedBom(bytes: Uint8Array): boolean {
  return DISALLOWED_CSV_BOMS.some((bom) => startsWith(bytes, bom));
}

/**
 * Infer the intended upload format from the file name extension and the
 * browser-declared MIME type. `file.type` alone is browser/OS controlled and
 * often wrong (a CSV can be reported as `text/plain`), so we fall back to the
 * extension whenever the declared type is not explicit.
 */
function inferFormat(file: File): "json" | "csv" | "unknown" {
  if (file.type === "application/json" || file.name.toLowerCase().endsWith(".json")) {
    return "json";
  }
  if (file.type === "text/csv" || file.name.toLowerCase().endsWith(".csv")) {
    return "csv";
  }
  return "unknown";
}

/**
 * Validate file magic bytes against the inferred format.
 * Returns true if valid, throws if suspicious.
 */
export async function validateMagicBytes(file: File): Promise<void> {
  const format = inferFormat(file);

  if (format === "unknown") {
    // Nothing to validate against; leave enforcement to the server.
    return;
  }

  const slice = file.slice(0, 8);
  const buffer = await slice.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (format === "json") {
    // JSON must start with { or [
    const firstNonWhitespace = Array.from(bytes).find(
      (b) => !isWhitespace(b)
    );
    if (
      firstNonWhitespace !== undefined &&
      firstNonWhitespace !== 0x7b &&
      firstNonWhitespace !== 0x5b
    ) {
      throw new Error(
        "File content does not match JSON format. Please upload a valid JSON file."
      );
    }
  } else {
    // CSV: reject UTF-16/UTF-32 encodings and binary null bytes.
    if (hasDisallowedBom(bytes)) {
      throw new Error(
        "File appears to use a non-UTF-8 encoding. Please upload a UTF-8 encoded CSV file."
      );
    }
    const hasNullBytes = Array.from(bytes).some((b) => b === 0x00);
    if (hasNullBytes) {
      throw new Error(
        "File appears to contain binary data. Please upload a valid CSV file."
      );
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