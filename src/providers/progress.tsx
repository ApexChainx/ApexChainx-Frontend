"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { bulkImportOutages } from "@/services/bulkImportService";
import type { BulkImportResult, ImportValidationError } from "@/types/bulkImport";

const ACCEPTED_TYPES = ["text/csv", "application/json"];
const ACCEPTED_EXTENSIONS = [".csv", ".json"];
const MAX_PREVIEW_ROWS = 5;

interface PreviewState {
  headers: string[];
  rows: string[][];
  warnings: ImportValidationError[];
  errors: ImportValidationError[];
}

const REQUIRED_CSV_FIELDS = ["service_id", "start_time", "end_time"];

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1, MAX_PREVIEW_ROWS + 1).map((l) =>
    l.split(",").map((c) => c.trim().replace(/^"|"$/g, ""))
  );
  return { headers, rows };
}

function validateCSV(headers: string[], rows: string[][]): ImportValidationError[] {
  const errors: ImportValidationError[] = [];
  const missing = REQUIRED_CSV_FIELDS.filter((f) => !headers.includes(f));
  if (missing.length > 0) {
    errors.push({ message: `Missing required columns: ${missing.join(", ")}` });
  }
  rows.forEach((row, i) => {
    if (row.length !== headers.length) {
      errors.push({ row: i + 2, message: `Column count mismatch (expected ${headers.length}, got ${row.length})` });
    }
  });
  return errors;
}

function validateJSON(text: string): ImportValidationError[] {
  const errors: ImportValidationError[] = [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    errors.push({ message: "Invalid JSON: could not parse file." });
    return errors;
  }
  if (!Array.isArray(parsed)) {
    errors.push({ message: "JSON must be an array of outage records." });
    return errors;
  }
  (parsed as Record<string, unknown>[]).slice(0, MAX_PREVIEW_ROWS).forEach((item, i) => {
    REQUIRED_CSV_FIELDS.forEach((field) => {
      if (item[field] == null) {
        errors.push({ row: i + 1, field, message: `Missing required field "${field}"` });
      }
    });
  });
  return errors;
}

async function buildPreview(file: File): Promise<PreviewState> {
  const text = await file.text();
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();

  if (ext === ".csv") {
    const { headers, rows } = parseCSV(text);
    const errors = validateCSV(headers, rows);
    const warnings: ImportValidationError[] = [];
    if (rows.length === 0 && errors.length === 0) {
      warnings.push({ message: "File has a header row but no data rows." });
    }
    return { headers, rows, errors, warnings };
  }

  // JSON
  const errors = validateJSON(text);
  let headers: string[] = [];
  let rows: string[][] = [];
  if (errors.length === 0) {
    const parsed = JSON.parse(text) as Record<string, unknown>[];
    if (parsed.length > 0) {
      headers = Object.keys(parsed[0]);
      rows = parsed.slice(0, MAX_PREVIEW_ROWS).map((r) => headers.map((h) => String(r[h] ?? "")));
    } else {
      return { headers: [], rows: [], errors: [], warnings: [{ message: "JSON array is empty." }] };
    }
  }
  return { headers, rows, errors, warnings: [] };
}

export default function BulkImportView() {
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  function validateFile(nextFile: File): string | null {
    const extension = nextFile.name.slice(nextFile.name.lastIndexOf(".")).toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(extension) && !ACCEPTED_TYPES.includes(nextFile.type)) {
      return "Only .csv and .json files are allowed.";
    }
    return null;
  }

  async function handleFile(nextFile: File) {
    const validationError = validateFile(nextFile);
    if (validationError) {
      setFileError(validationError);
      setFile(null);
      setPreview(null);
      return;
    }
    setFileError(null);
    setFile(nextFile);
    setResult(null);
    setSubmitError(null);
    const p = await buildPreview(nextFile);
    setPreview(p);
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0];
    if (nextFile) void handleFile(nextFile);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const nextFile = event.dataTransfer.files?.[0];
    if (nextFile) void handleFile(nextFile);
  }

  async function handleSubmit() {
    if (!file) return;
    if (preview && preview.errors.length > 0) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
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
      if (inputRef.current) inputRef.current.value = "";
    } catch (err: unknown) {
      if ((err as { name?: string }).name === "CanceledError") {
        // cancelled — form stays ready
      } else {
        setSubmitError("Upload failed. Please try again.");
      }
    } finally {
      abortRef.current = null;
      setLoading(false);
      setProgress(0);
    }
  }

  function handleCancel() {
    abortRef.current?.abort();
  }

  function handleReset() {
    setFile(null);
    setFileError(null);
    setPreview(null);
    setResult(null);
    setSubmitError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const hasBlockingErrors = (preview?.errors.length ?? 0) > 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Bulk Outage Import</h1>
          <Link href="/bulk-import/history" className="text-sm text-blue-600 hover:underline">
            View history →
          </Link>
        </div>
        <p className="text-sm text-gray-500">
          Upload a `.csv` or `.json` file to create outages in one pass.
        </p>
      </div>

      <div
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors ${
          dragging ? "border-blue-400 bg-blue-50" : "border-gray-300 bg-gray-50 hover:border-blue-300 hover:bg-blue-50"
        }`}
      >
        <svg className="mb-3 h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V4m0 0L8 8m4-4l4 4" />
        </svg>
        <p className="text-sm font-medium text-gray-600">
          Drag and drop or <span className="text-blue-600 underline">browse</span>
        </p>
        <p className="mt-1 text-xs text-gray-400">Accepted formats: .csv, .json</p>
        <input ref={inputRef} type="file" accept=".csv,.json" className="hidden" onChange={handleInputChange} />
      </div>

      {fileError ? (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{fileError}</p>
      ) : null}

      {file ? (
        <div className="flex items-center justify-between rounded-lg border bg-white px-4 py-3 text-sm text-gray-700 shadow-sm">
          <span className="font-medium">{file.name}</span>
          <button onClick={handleReset} className="text-gray-400 hover:text-red-500">&#x2715;</button>
        </div>
      ) : null}

      {/* Client-side validation summary (issues 123 + 124) */}
      {preview ? (
        <div className="space-y-3">
          {preview.errors.length > 0 ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="mb-1 text-sm font-semibold text-red-700">
                {preview.errors.length} blocking error{preview.errors.length > 1 ? "s" : ""} — fix before uploading
              </p>
              <ul className="space-y-0.5">
                {preview.errors.map((e, i) => (
                  <li key={i} className="text-xs text-red-600">
                    {e.row != null ? <span className="font-semibold">Row {e.row}: </span> : null}
                    {e.field ? <span className="font-semibold">[{e.field}] </span> : null}
                    {e.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {preview.warnings.length > 0 ? (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
              <p className="mb-1 text-sm font-semibold text-yellow-700">Warnings</p>
              <ul className="space-y-0.5">
                {preview.warnings.map((w, i) => (
                  <li key={i} className="text-xs text-yellow-700">{w.message}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* File preview table */}
          {preview.headers.length > 0 && preview.rows.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
              <p className="border-b px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Preview (first {preview.rows.length} row{preview.rows.length > 1 ? "s" : ""})
              </p>
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    {preview.headers.map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, i) => (
                    <tr key={i} className="border-t">
                      {row.map((cell, j) => (
                        <td key={j} className="px-3 py-2 text-gray-700">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2">
        {loading ? (
          <>
            <div className="w-full rounded-full bg-gray-200 h-2 overflow-hidden">
              <div
                className="h-2 rounded-full bg-blue-600 transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{progress}% uploaded</span>
              <button
                onClick={handleCancel}
                className="text-xs text-red-500 hover:underline"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={() => void handleSubmit()}
            disabled={!file || hasBlockingErrors}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Upload File
          </button>
        )}
      </div>

      {submitError ? (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{submitError}</p>
      ) : null}

      {result ? (
        <div className="space-y-4 rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-700">Import Summary</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-green-50 p-4 text-center">
              <p className="text-2xl font-bold text-green-700">{result.imported}</p>
              <p className="text-xs text-green-600">Imported</p>
            </div>
            <div className="rounded-lg bg-yellow-50 p-4 text-center">
              <p className="text-2xl font-bold text-yellow-700">{result.skipped}</p>
              <p className="text-xs text-yellow-600">Skipped</p>
            </div>
          </div>

          {result.errors.length > 0 ? (
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
                    const blob = new Blob([csv], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `import-errors-${new Date().toISOString().slice(0, 10)}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Download report
                </button>
              </div>
              <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg bg-red-50 p-3">
                {result.errors.map((error, index) => (
                  <li key={`${error.message}-${index}`} className="text-xs text-red-700">
                    {error.row != null ? <span className="font-semibold">Row {error.row}: </span> : null}
                    {error.field ? <span className="font-semibold">[{error.field}] </span> : null}
                    {error.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
