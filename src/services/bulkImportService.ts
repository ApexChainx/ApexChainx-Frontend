/** ApexChain Network Operations Intelligence Platform */
import { AxiosProgressEvent, AxiosRequestConfig } from "axios";

import { api } from "@/lib/api";

import type {
  BulkImportRecord,
  BulkImportResult,
} from "@/types/bulkImport";

const BULK_IMPORT_ENDPOINT = "/outages/bulk";
const BULK_IMPORT_HISTORY_ENDPOINT = "/outages/bulk/history";

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
 * Upload outages file for bulk import.
 */
export async function bulkImportOutages(
  file: File,
  options?: BulkImportOptions
): Promise<BulkImportResult> {
  if (!file) {
    throw new Error("No file provided for upload.");
  }

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