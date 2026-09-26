"use client";
/** ApexChain Network Operations Intelligence Platform */

import Link from "next/link";
import { useRef, useState, useCallback, useId } from "react";

import { bulkImportOutages } from "@/services/bulkImportService";
import type { BulkImportResult, ImportValidationError } from "@/types/bulkImport";
import { STELLAR_NETWORK } from "@/lib/explorer";

// ─── Constants ───────────────────────────────────────────────────────────────

const ALLOW_BULK = process.env.NEXT_PUBLIC_ALLOW_BULK === "1";
const IS_MAINNET = STELLAR_NETWORK === "mainnet";
// On mainnet, bulk operations require explicit ALLOW_BULK=1 opt-in
const BULK_DISABLED = IS_MAINNET && !ALLOW_BULK;
const ACCEPTED_TYPES = ["text/csv", "application/json"] as const;
const ACCEPTED_EXTENSIONS = [".csv", ".json"] as const;
// Rows rendered per preview page. The full file is parsed and validated up
// front; the pane pages through it so large imports can be audited row by
// row instead of only the first five being visible.
const PREVIEW_PAGE_SIZE = 10;
// How many numbered page buttons to show around the current page.
const PAGE_BUTTON_WINDOW = 5;
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const REQUIRED_FIELDS = ["service_id", "start_time", "end_time"] as const;

// Field-level shape checks shared by the CSV and JSON validators (issue #610):
// missing site, invalid severity, and malformed timestamps are flagged in the
// preview so operators fix rows before spending an import cycle, instead of
// reacting to a failed batch. Values are optional; empties are only reported
// when the field is required.
const VALID_SEVERITIES = ["critical", "high", "medium", "low"] as const;
const OPTIONAL_ENUM_FIELDS = ["severity"] as const;
const TIMESTAMP_FIELDS = ["start_time", "end_time", "detected_at", "resolved_at"] as const;
const SITE_FIELDS = ["site_name"] as const;

function isValidTimestamp(value: string): boolean {
  return !Number.isNaN(new Date(value).getTime());
}

/**
 * Field-level shape checks for a single row's values, keyed by column name.
 * Only fields present in the row's headers/keys are checked, so optional
 * columns that are simply absent never produce noise.
 */
function validateRowFields(values: Record<string, string>): ImportValidationError[] {
  const errors: ImportValidationError[] = [];

  for (const field of SITE_FIELDS) {
    if (field in values && values[field]?.trim() === "") {
      errors.push({ field, message: `Field "${field}" is present but empty` });
    }
  }

  for (const field of OPTIONAL_ENUM_FIELDS) {
    const value = values[field]?.trim() ?? "";
    if (field in values && value !== "" && !VALID_SEVERITIES.includes(value.toLowerCase() as typeof VALID_SEVERITIES[number])) {
      errors.push({
        field,
        message: `Invalid ${field} "${value}" (expected one of: ${VALID_SEVERITIES.join(", ")})`,
      });
    }
  }

  for (const field of TIMESTAMP_FIELDS) {
    if (field in values && values[field]?.trim() !== "" && !isValidTimestamp(values[field]?.trim() ?? "")) {
      errors.push({ field, message: `Malformed timestamp in "${field}"` });
    }
  }

  return errors;
}

// Optional columns the backend accepts for bulk outage import. Columns outside
// this set (plus REQUIRED_FIELDS) are treated as unrecognized and surface a
// non-blocking warning so the user can still proceed with the upload.
const OPTIONAL_FIELDS = [
  "severity",
  "status",
  "description",
  "site_name",
  "detected_at",
  "resolved_at",
  "affected_services",
  "affected_subscribers",
  "assigned_to",
  "created_by",
  "root_cause",
  "resolution_notes",
] as const;

const KNOWN_FIELDS = new Set<string>([...REQUIRED_FIELDS, ...OPTIONAL_FIELDS]);

// Cap client-side row validation so it stays well under the 500ms budget for
// files up to 1000 rows.
const MAX_VALIDATED_ROWS = 1000;

type AcceptedExtension = (typeof ACCEPTED_EXTENSIONS)[number];
type AcceptedMimeType = (typeof ACCEPTED_TYPES)[number];

// ─── Types ───────────────────────────────────────────────────────────────────
interface PreviewState {
  headers: string[];
  rows: string[][];
  warnings: ImportValidationError[];
  errors: ImportValidationError[];
  totalRows: number;
  /** Error messages keyed by display row number (see rowNumberOffset). */
  rowErrors: Record<number, string[]>;
  /**
   * Added to a zero-based row index to get the number shown to users and
   * used in validation errors: 2 for CSV (row 1 is the header), 1 for JSON
   * (records start at 1).
   */
  rowNumberOffset: number;
}

interface FileValidationResult {
  valid: boolean;
  error?: string;
}

type UploadStatus = "idle" | "validating" | "uploading" | "success" | "error" | "cancelled";

// ─── CSV Parsing ─────────────────────────────────────────────────────────────
interface ParsedCSV {
  headers: string[];
  rows: string[][];
  totalRows: number;
}

function parseCSV(text: string): ParsedCSV {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
  
  if (lines.length === 0) {
    return { headers: [], rows: [], totalRows: 0 };
  }

  // Robust CSV parsing: handles quoted fields containing commas
  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++; // Skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const firstLine = lines[0];
  const headers = firstLine ? parseLine(firstLine).map((h) => h.replace(/^"|"$/g, "")) : [];
  const rows = lines.slice(1).map(parseLine);
  
  return {
    headers,
    rows,
    totalRows: rows.length,
  };
}

// ─── Validation ──────────────────────────────────────────────────────────────
interface CSVValidationResult {
  errors: ImportValidationError[];
  warnings: ImportValidationError[];
}

function validateCSV(headers: string[], rows: string[][]): CSVValidationResult {
  const errors: ImportValidationError[] = [];
  const warnings: ImportValidationError[] = [];
  
  const missing = REQUIRED_FIELDS.filter((f) => !headers.includes(f));
  if (missing.length > 0) {
    errors.push({ 
      message: `Missing required columns: ${missing.join(", ")}`,
      field: missing.join(", "),
    });
  }

  // Unrecognized columns are a non-blocking warning: the user can still
  // proceed, but is told the columns will not be imported.
  const unrecognized = headers.filter((h) => !KNOWN_FIELDS.has(h));
  if (unrecognized.length > 0) {
    warnings.push({
      message: `Unrecognized column${unrecognized.length > 1 ? "s" : ""}: ${unrecognized.join(", ")}. These will be ignored during import.`,
      field: unrecognized.join(", "),
    });
  }

  // Validate the whole file (capped for the 500ms budget) so errors in later
  // rows surface before the upload starts, not after.
  const rowsToValidate = rows.slice(0, MAX_VALIDATED_ROWS);
  rowsToValidate.forEach((row, i) => {
    if (row.length !== headers.length) {
      errors.push({
        row: i + 2,
        message: `Column count mismatch (expected ${headers.length}, got ${row.length})`,
      });
    }
    
    // Validate required fields have values
    REQUIRED_FIELDS.forEach((field) => {
      const colIndex = headers.indexOf(field);
      if (colIndex !== -1 && (!row[colIndex] || row[colIndex].trim() === "")) {
        errors.push({
          row: i + 2,
          field,
          message: `Required field "${field}" is empty`,
        });
      }
    });

    // Field-level shape checks (site, severity, timestamps) — issue #610.
    const present = headers
      .map((h, colIndex) => [h, row[colIndex] ?? ""] as const)
      .filter(([h]) => KNOWN_FIELDS.has(h));
    validateRowFields(Object.fromEntries(present)).forEach((e) => {
      errors.push({ row: i + 2, ...e });
    });
  });

  if (rows.length > MAX_VALIDATED_ROWS) {
    warnings.push({
      message: `Validation covers the first ${MAX_VALIDATED_ROWS} rows. Remaining rows will be checked by the backend.`,
    });
  }

  return { errors, warnings };
}

function validateJSON(text: string): { errors: ImportValidationError[]; parsed?: Record<string, unknown>[] } {
  const errors: ImportValidationError[] = [];
  let parsed: unknown;
  
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    const message = e instanceof SyntaxError ? `Invalid JSON: ${e.message}` : "Invalid JSON: could not parse file.";
    errors.push({ message });
    return { errors };
  }

  if (!Array.isArray(parsed)) {
    errors.push({ message: "JSON must be an array of outage records." });
    return { errors };
  }

  if (parsed.length === 0) {
    errors.push({ message: "JSON array is empty." });
    return { errors };
  }

  const records = parsed as Record<string, unknown>[];
  
  // Validate every record (capped for the 500ms budget) so problems in later
  // rows surface in the preview, not after the upload.
  records.slice(0, MAX_VALIDATED_ROWS).forEach((item, i) => {
    if (item === null || typeof item !== "object") {
      errors.push({ row: i + 1, message: `Item ${i + 1} is not a valid object` });
      return;
    }
    
    REQUIRED_FIELDS.forEach((field) => {
      if (item[field] == null || item[field] === "") {
        errors.push({
          row: i + 1,
          field,
          message: `Missing required field "${field}"`,
        });
      }
    });

    // Field-level shape checks (site, severity, timestamps) — issue #610.
    const values: Record<string, string> = {};
    for (const key of Object.keys(item)) {
      if (KNOWN_FIELDS.has(key)) {
        values[key] = String(item[key] ?? "");
      }
    }
    validateRowFields(values).forEach((e) => {
      errors.push({ row: i + 1, ...e });
    });
  });

  return { errors, parsed: records };
}

// ─── Preview Builder ─────────────────────────────────────────────────────────
/**
 * Index per-row validation errors by the row number shown in the preview so
 * the table can mark each row's status without another submit.
 */
function collectRowErrors(errors: ImportValidationError[]): Record<number, string[]> {
  const rowErrors: Record<number, string[]> = {};
  for (const error of errors) {
    if (error.row == null) continue;
    (rowErrors[error.row] ??= []).push(error.message);
  }
  return rowErrors;
}

async function buildPreview(file: File): Promise<PreviewState> {
  const text = await file.text();
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase() as AcceptedExtension;

  if (ext === ".csv" || file.type === "text/csv") {
    const { headers, rows, totalRows } = parseCSV(text);
    const { errors, warnings: schemaWarnings } = validateCSV(headers, rows);
    const warnings: ImportValidationError[] = [...schemaWarnings];
    
    if (totalRows === 0 && errors.length === 0) {
      warnings.push({ message: "File has a header row but no data rows." });
    }
    
    return { headers, rows, errors, warnings, totalRows, rowErrors: collectRowErrors(errors), rowNumberOffset: 2 };
  }

  // JSON
  const { errors, parsed } = validateJSON(text);
  
  // Only structural failures (invalid JSON, non-array, empty array) suppress
  // the preview entirely; row-level errors still preview with inline chips
  // so operators can see which records are affected (issue #610).
  if (!parsed) {
    return { headers: [], rows: [], errors, warnings: [], totalRows: 0, rowErrors: collectRowErrors(errors), rowNumberOffset: 1 };
  }

  const headers = parsed.length > 0 && parsed[0] ? Object.keys(parsed[0]) : [];
  const rows = parsed.map((r) => 
    headers.map((h) => String(r[h] ?? ""))
  );

  return { headers, rows, errors, warnings: [], totalRows: parsed.length, rowErrors: collectRowErrors(errors), rowNumberOffset: 1 };
}

/** Page numbers to render around the current page (windowed). */
function getPageWindow(currentPage: number, pageCount: number): number[] {
  let start = Math.max(0, currentPage - Math.floor(PAGE_BUTTON_WINDOW / 2));
  const end = Math.min(pageCount, start + PAGE_BUTTON_WINDOW);
  start = Math.max(0, end - PAGE_BUTTON_WINDOW);
  return Array.from({ length: end - start }, (_, i) => start + i);
}

// ─── Components ──────────────────────────────────────────────────────────────

function Alert({ 
  type, 
  title, 
  children, 
  onDismiss 
}: { 
  type: "error" | "warning" | "success"; 
  title?: string; 
  children: React.ReactNode;
  onDismiss?: () => void;
}) {
  const styles = {
    error: "border-red-200 bg-red-50 text-red-700",
    warning: "border-yellow-200 bg-yellow-50 text-yellow-700",
    success: "border-green-200 bg-green-50 text-green-700",
  };

  const icon = {
    error: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    success: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  };

  return (
    <div className={`relative rounded-lg border p-3 ${styles[type]}`} role="alert">
      <div className="flex items-start gap-2">
        {icon[type]}
        <div className="flex-1">
          {title && <p className="text-sm font-semibold">{title}</p>}
          <div className={title ? "mt-0.5" : ""}>{children}</div>
        </div>
        {onDismiss && (
          <button 
            onClick={onDismiss}
            className="ml-auto -mr-1 -mt-1 p-1 hover:opacity-70 transition-opacity"
            aria-label="Dismiss"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

function ValidationList({ errors }: { errors: ImportValidationError[] }) {
  return (
    <ul className="space-y-1">
      {errors.map((e, i) => (
        <li key={`${e.row}-${e.field}-${i}`} className="text-xs">
          {e.row != null && <span className="font-semibold">Row {e.row}: </span>}
          {e.field && <span className="font-semibold">[{e.field}] </span>}
          <span>{e.message}</span>
        </li>
      ))}
    </ul>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function BulkImportView() {
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [previewPage, setPreviewPage] = useState(0);
  
  const id = useId();
  const fileInputId = `file-input-${id}`;

  // ─── File Validation ───────────────────────────────────────────────────────
  const validateFile = useCallback((nextFile: File): FileValidationResult => {
    const extension = nextFile.name.slice(nextFile.name.lastIndexOf(".")).toLowerCase() as AcceptedExtension;
    const isAcceptedType = ACCEPTED_EXTENSIONS.includes(extension) || ACCEPTED_TYPES.includes(nextFile.type as AcceptedMimeType);
    
    if (!isAcceptedType) {
      return { valid: false, error: `Invalid file type. Accepted formats: ${ACCEPTED_EXTENSIONS.join(", ")}` };
    }
    
    if (nextFile.size > MAX_FILE_SIZE_BYTES) {
      return { valid: false, error: `File too large. Maximum size: ${MAX_FILE_SIZE_MB}MB` };
    }
    
    if (nextFile.size === 0) {
      return { valid: false, error: "File is empty." };
    }
    
    return { valid: true };
  }, []);

  // ─── File Handling ─────────────────────────────────────────────────────────
  const handleFile = useCallback(async (nextFile: File) => {
    const validation = validateFile(nextFile);
    if (!validation.valid) {
      setFileError(validation.error ?? "Invalid file");
      setFile(null);
      setPreview(null);
      return;
    }

    setFileError(null);
    setFile(nextFile);
    setResult(null);
    setSubmitError(null);
    setPreviewPage(0);
    setStatus("validating");

    try {
      const p = await buildPreview(nextFile);
      setPreview(p);
      setStatus(p.errors.length > 0 ? "error" : "idle");
    } catch (err) {
      setFileError("Failed to read file. Please check the file format.");
      setStatus("error");
    }
  }, [validateFile]);

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0];
    if (nextFile) void handleFile(nextFile);
    // Reset input so same file can be selected again if needed
    event.target.value = "";
  }, [handleFile]);

  // ─── Drag & Drop ───────────────────────────────────────────────────────────
  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    // Only set dragging false if leaving the dropzone, not entering a child
    if (dropZoneRef.current && !dropZoneRef.current.contains(event.relatedTarget as Node)) {
      setDragging(false);
    }
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);
    
    const files = event.dataTransfer.files;
    if (files.length > 1) {
      setFileError("Please upload only one file at a time.");
      return;
    }
    
    const nextFile = files?.[0];
    if (nextFile) void handleFile(nextFile);
  }, [handleFile]);

  // ─── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!file || (preview && preview.errors.length > 0)) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("uploading");
    setProgress(0);
    setSubmitError(null);
    setResult(null);

    try {
      const response = await bulkImportOutages(file, {
        signal: controller.signal,
        onProgress: setProgress,
      });
      
      setResult(response);
      setFile(null);
      setPreview(null);
      setStatus("success");
      
      if (inputRef.current) inputRef.current.value = "";
    } catch (err: unknown) {
      if ((err as { name?: string }).name === "CanceledError" || (err as { name?: string }).name === "AbortError") {
        setStatus("cancelled");
      } else if (err instanceof Error) {
        setSubmitError(err.message || "Upload failed. Please try again.");
        setStatus("error");
      } else {
        setSubmitError("Upload failed. Please try again.");
        setStatus("error");
      }
    } finally {
      abortRef.current = null;
      if (status !== "cancelled") {
        setProgress(0);
      }
    }
  }, [file, preview, status]);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    setStatus("cancelled");
    setProgress(0);
  }, []);

  const handleReset = useCallback(() => {
    setFile(null);
    setFileError(null);
    setPreview(null);
    setResult(null);
    setSubmitError(null);
    setStatus("idle");
    setProgress(0);
    setPreviewPage(0);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const hasBlockingErrors = (preview?.errors.length ?? 0) > 0;
  const isProcessing = status === "uploading" || status === "validating";
  const pageCount = preview ? Math.max(1, Math.ceil(preview.rows.length / PREVIEW_PAGE_SIZE)) : 1;
  const safePreviewPage = Math.min(previewPage, pageCount - 1);
  const pageRows = preview ? preview.rows.slice(safePreviewPage * PREVIEW_PAGE_SIZE, (safePreviewPage + 1) * PREVIEW_PAGE_SIZE) : [];
  const invalidRowCount = preview ? Object.keys(preview.rowErrors).length : 0;

  // Mainnet bulk safety gate — early return with disabled message
  if (BULK_DISABLED) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-800">Bulk Outage Import</h1>
        </div>
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-6 text-center">
          <svg className="mx-auto mb-3 h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m9.364-6.364a9 9 0 11-12.728 0 9 9 0 0112.728 0zM12 9v2m0 4h.01" />
          </svg>
          <h2 className="text-lg font-semibold text-red-700">Bulk Operations Disabled</h2>
          <p className="mt-2 text-sm text-red-600">
            Bulk import is not available on <strong>mainnet</strong> for safety reasons.
            Set <code className="rounded bg-red-100 px-1 py-0.5 font-mono text-xs">NEXT_PUBLIC_ALLOW_BULK=1</code>{" "}
            in your environment to enable this feature.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Bulk Outage Import</h1>
          <Link 
            href="/bulk-import/history" 
            className="text-sm text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
          >
            View history →
          </Link>
        </div>
        <p className="text-sm text-gray-500">
          Upload a <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">.csv</code> or{" "}
          <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">.json</code> file to create outages in one pass.
        </p>
      </div>

      {/* Drop Zone */}
      <div
        ref={dropZoneRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="File upload dropzone. Click or press Enter to browse files."
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          dragging 
            ? "border-blue-400 bg-blue-50" 
            : "border-gray-300 bg-gray-50 hover:border-blue-300 hover:bg-blue-50"
        } ${isProcessing ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}`}
      >
        <svg 
          className="mb-3 h-10 w-10 text-gray-400" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={1.5} 
            d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V4m0 0L8 8m4-4l4 4" 
          />
        </svg>
        <p className="text-sm font-medium text-gray-600">
          Drag and drop or <span className="text-blue-600 underline">browse</span>
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Accepted formats: {ACCEPTED_EXTENSIONS.join(", ")} (max {MAX_FILE_SIZE_MB}MB)
        </p>
        <input 
          ref={inputRef} 
          id={fileInputId}
          type="file" 
          accept={ACCEPTED_EXTENSIONS.join(",")}
          className="hidden" 
          onChange={handleInputChange}
          aria-label="Choose file"
          disabled={isProcessing}
        />
      </div>

      {/* File Error */}
      {fileError && (
        <Alert type="error" onDismiss={() => setFileError(null)}>
          {fileError}
        </Alert>
      )}

      {/* File Info */}
      {file && !result && (
        <div className="flex items-center justify-between rounded-lg border bg-white px-4 py-3 text-sm text-gray-700 shadow-sm">
          <div className="flex items-center gap-2 min-w-0">
            <svg className="h-4 w-4 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="font-medium truncate">{file.name}</span>
            <span className="text-xs text-gray-400 flex-shrink-0">
              ({(file.size / 1024).toFixed(1)} KB)
            </span>
          </div>
          {!isProcessing && (
            <button 
              onClick={handleReset} 
              className="ml-2 p-1 text-gray-400 hover:text-red-500 transition-colors rounded focus:outline-none focus:ring-2 focus:ring-red-500"
              aria-label="Remove file"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Validation & Preview */}
      {preview && !result && (
        <div className="space-y-3">
          {/* Errors */}
          {preview.errors.length > 0 && (
            <Alert 
              type="error" 
              title={`${preview.errors.length} blocking error${preview.errors.length > 1 ? "s" : ""} — fix before uploading`}
            >
              <ValidationList errors={preview.errors} />
            </Alert>
          )}

          {/* Warnings */}
          {preview.warnings.length > 0 && (
            <Alert type="warning" title="Warnings">
              <ul className="space-y-0.5">
                {preview.warnings.map((w, i) => (
                  <li key={i} className="text-xs">{w.message}</li>
                ))}
              </ul>
            </Alert>
          )}

          {/* Preview Table */}
          {preview.headers.length > 0 && preview.rows.length > 0 && (
            <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
              <div className="border-b px-4 py-2 flex items-center justify-between bg-gray-50">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Preview
                </p>
                <div className="flex items-center gap-2">
                  {invalidRowCount > 0 && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      {invalidRowCount} row{invalidRowCount > 1 ? "s" : ""} invalid
                    </span>
                  )}
                  <p className="text-xs text-gray-400">
                    {preview.totalRows} row{preview.totalRows > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      {preview.headers.map((h) => (
                        <th 
                          key={h} 
                          className={`px-3 py-2 text-left font-semibold text-gray-600 ${
                            REQUIRED_FIELDS.includes(h as typeof REQUIRED_FIELDS[number]) ? "text-blue-700" : ""
                          }`}
                          title={REQUIRED_FIELDS.includes(h as typeof REQUIRED_FIELDS[number]) ? "Required field" : undefined}
                        >
                          {h}
                          {REQUIRED_FIELDS.includes(h as typeof REQUIRED_FIELDS[number]) && (
                            <span className="ml-0.5 text-blue-500">*</span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((row, i) => {
                      const rowNumber = safePreviewPage * PREVIEW_PAGE_SIZE + i + preview.rowNumberOffset;
                      const rowErrorList = preview.rowErrors[rowNumber];
                      return (
                        <tr
                          key={i}
                          className={`border-t transition-colors ${
                            rowErrorList ? "bg-red-50" : "hover:bg-gray-50"
                          }`}
                        >
                          {row.map((cell, j) => (
                            <td key={j} className="px-3 py-2 text-gray-700 max-w-[200px] truncate" title={cell}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Per-row error chips — issue #610 */}
              {(() => {
                const pageErrorEntries = Object.entries(preview.rowErrors)
                  .map(([rowStr, messages]) => ({
                    row: Number(rowStr),
                    messages,
                  }))
                  .filter(({ row }) => {
                    const zeroBased = row - preview.rowNumberOffset;
                    return (
                      zeroBased >= safePreviewPage * PREVIEW_PAGE_SIZE &&
                      zeroBased < (safePreviewPage + 1) * PREVIEW_PAGE_SIZE
                    );
                  })
                  .sort((a, b) => a.row - b.row);

                if (pageErrorEntries.length === 0) return null;

                return (
                  <div className="border-t bg-red-50 px-4 py-2">
                    <div className="flex flex-wrap gap-1.5">
                      {pageErrorEntries.map(({ row, messages }) =>
                        messages.map((message) => (
                          <span
                            key={`${row}-${message}`}
                            title={message}
                            className="inline-flex max-w-full items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700"
                          >
                            <svg
                              className="h-3 w-3 flex-shrink-0"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              aria-hidden="true"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                              />
                            </svg>
                            <span className="truncate">
                              Row {row}: {message}
                            </span>
                          </span>
                        )),
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Pagination controls */}
              {pageCount > 1 && (
                <nav
                  aria-label="Preview pagination"
                  className="flex items-center justify-between border-t bg-gray-50 px-4 py-2"
                >
                  <button
                    type="button"
                    onClick={() => setPreviewPage((p) => Math.max(0, p - 1))}
                    disabled={safePreviewPage === 0}
                    className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ← Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {getPageWindow(safePreviewPage, pageCount).map((page) => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setPreviewPage(page)}
                        aria-current={page === safePreviewPage ? "page" : undefined}
                        aria-label={`Page ${page + 1}`}
                        className={`h-6 min-w-[1.5rem] rounded px-1 text-xs transition-colors ${
                          page === safePreviewPage
                            ? "bg-blue-600 font-semibold text-white"
                            : "border border-gray-300 bg-white text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {page + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewPage((p) => Math.min(pageCount - 1, p + 1))}
                    disabled={safePreviewPage === pageCount - 1}
                    className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next →
                  </button>
                </nav>
              )}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2">
        {status === "uploading" ? (
          <>
            <div className="w-full rounded-full bg-gray-200 h-2 overflow-hidden" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
              <div
                className="h-2 rounded-full bg-blue-600 transition-all duration-200 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{progress}% uploaded</span>
              <button
                onClick={handleCancel}
                className="text-xs text-red-500 hover:underline focus:outline-none focus:ring-2 focus:ring-red-500 rounded px-1"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={() => void handleSubmit()}
            disabled={!file || hasBlockingErrors || isProcessing}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-blue-600"
          >
            {status === "validating" ? "Validating..." : "Upload File"}
          </button>
        )}
      </div>

      {/* Submit Error */}
      {submitError && (
        <Alert type="error" onDismiss={() => setSubmitError(null)}>
          {submitError}
        </Alert>
      )}

      {/* Success Result */}
      {result && (
        <div className="space-y-4 rounded-xl border bg-white p-5 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-700">Import Summary</h2>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-green-50 p-4 text-center">
              <p className="text-2xl font-bold text-green-700">{result.imported}</p>
              <p className="text-xs text-green-600">Imported</p>
            </div>
            <div className="rounded-lg bg-yellow-50 p-4 text-center">
              <p className="text-2xl font-bold text-yellow-700">{result.skipped}</p>
              <p className="text-xs text-yellow-600">Skipped</p>
            </div>
            <div className="rounded-lg bg-red-50 p-4 text-center">
              <p className="text-2xl font-bold text-red-700">{result.errors.length}</p>
              <p className="text-xs text-red-600">Errors</p>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-red-600">
                  {result.errors.length} validation error{result.errors.length > 1 ? "s" : ""}
                </p>
                <button
                  onClick={() => {
                    const rows = [
                      ["row", "field", "message"],
                      ...result.errors.map((e) => [
                        e.row != null ? String(e.row) : "",
                        e.field ?? "",
                        e.message,
                      ]),
                    ];
                    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
                    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `import-errors-${new Date().toISOString().slice(0, 10)}.csv`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                  className="text-xs text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
                >
                  Download report
                </button>
              </div>
              <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg bg-red-50 p-3">
                {result.errors.map((error, index) => (
                  <li key={`${error.message}-${index}`} className="text-xs text-red-700">
                    {error.row != null && <span className="font-semibold">Row {error.row}: </span>}
                    {error.field && <span className="font-semibold">[{error.field}] </span>}
                    {error.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={handleReset}
            className="w-full rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Upload Another File
          </button>
        </div>
      )}
    </div>
  );
}