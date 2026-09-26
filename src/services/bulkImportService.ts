/** ApexChain Network Operations Intelligence Platform */
import { AxiosProgressEvent, AxiosRequestConfig } from "axios";

import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

import type {
  BulkImportProgress,
  BulkImportRecord,
  BulkImportResult,
  BulkImportStage,
} from "@/types/bulkImport";

export type {
  BulkImportProgress,
  BulkImportRecord,
  BulkImportResult,
  BulkImportStage,
};

const BULK_IMPORT_ENDPOINT = ENDPOINTS.outages.bulk;
const BULK_IMPORT_HISTORY_ENDPOINT = ENDPOINTS.outages.bulkHistory;

const MAGIC_BYTES: Record<string, number[]> = {
  "text/csv": [0xEF, 0xBB, 0xBF], // UTF-8 BOM (optional for CSV)
  "application/json": [0x7B], // {
  "text/plain": [], // No magic bytes requirement
};

export interface BulkImportOptions {
  signal?: AbortSignal;
  /**
   * Issue #614 — staged progress callback. The import runs as a single
   * request, so progress is emitted at the real phase boundaries (file
   * inspection → content validation → upload → server apply → done), with
   * the axios upload byte ratio mapped onto the submitting stage.
   */
  onProgress?: (progress: BulkImportProgress) => void;
}

/**
 * Issue #614 — overall-percent anchors for each import stage. The upload
 * itself is one shot, so the byte ratio is scaled into the submitting band
 * and the later stages land at fixed anchors, keeping `percent`
 * monotonically increasing for the progress strip.
 */
const STAGE_PERCENT = {
  parsing: 0,
  validating: 10,
  submittingStart: 15,
  submittingEnd: 90,
  applying: 95,
  done: 100,
} as const;

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

function extractErrorMessage(error: unknown): string {
  const apiError = error as APIError;

  return (
    apiError.response?.data?.message ||
    apiError.message ||
    "Something went wrong during bulk import."
  );
}

function buildUploadConfig(
  options?: BulkImportOptions,
  fileSize = 0
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
      // Issue #614 — map the raw upload byte ratio onto the submitting
      // stage band so the strip shows per-upload progress instead of a
      // single frozen percentage.
      const total = event.total || fileSize;
      const ratio =
        total > 0 ? Math.min(1, Math.max(0, event.loaded / total)) : 0;
      options.onProgress?.({
        stage: "submitting",
        processed: event.loaded,
        total,
        percent:
          STAGE_PERCENT.submittingStart +
          Math.round(
            (STAGE_PERCENT.submittingEnd - STAGE_PERCENT.submittingStart) *
              ratio
          ),
      });
    };
  }

  return config;
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
 *
 * Issue #614 — emits staged progress at the real phase boundaries: parsing
 * (file inspection), validating (magic-byte check), submitting (upload,
 * driven by axios byte progress), applying (server accepted the batch) and
 * done (result in hand). The return value is unchanged; progress is
 * additive for consumers that want it.
 */
export async function bulkImportOutages(
  file: File,
  options?: BulkImportOptions
): Promise<BulkImportResult> {
  if (!file) {
    throw new Error("No file provided for upload.");
  }

  options?.onProgress?.({
    stage: "parsing",
    processed: 0,
    total: 0,
    percent: STAGE_PERCENT.parsing,
  });

  await validateMagicBytes(file);

  options?.onProgress?.({
    stage: "validating",
    processed: 0,
    total: 0,
    percent: STAGE_PERCENT.validating,
  });

  try {
    const formData = createFormData(file);

    const response = await api.post<BulkImportResult>(
      BULK_IMPORT_ENDPOINT,
      formData,
      buildUploadConfig(options, file.size)
    );

    options?.onProgress?.({
      stage: "applying",
      processed: file.size,
      total: file.size,
      percent: STAGE_PERCENT.applying,
    });
    options?.onProgress?.({
      stage: "done",
      processed: file.size,
      total: file.size,
      percent: STAGE_PERCENT.done,
    });

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