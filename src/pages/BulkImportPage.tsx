import React, { useRef, useState } from "react";
import { bulkImportOutages } from "../services/bulkImportService";
import { BulkImportResult } from "../types/bulkImport";

const ACCEPTED_TYPES = ["text/csv", "application/json"];
const ACCEPTED_EXTENSIONS = [".csv", ".json"];

const BulkImportPage: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const validateFile = (f: File): string | null => {
    const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext) && !ACCEPTED_TYPES.includes(f.type)) {
      return "Only .csv and .json files are allowed.";
    }
    return null;
  };

  const handleFile = (f: File) => {
    const err = validateFile(f);
    if (err) {
      setFileError(err);
      setFile(null);
    } else {
      setFileError(null);
      setFile(f);
      setResult(null);
      setSubmitError(null);
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const onSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setSubmitError(null);
    setResult(null);
    try {
      const res = await bulkImportOutages(file);
      setResult(res);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch {
      setSubmitError("Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onReset = () => {
    setFile(null);
    setFileError(null);
    setResult(null);
    setSubmitError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-800">Bulk Outage Import</h1>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors ${
          dragging
            ? "border-blue-400 bg-blue-50"
            : "border-gray-300 bg-gray-50 hover:border-blue-300 hover:bg-blue-50"
        }`}
      >
        <svg
          className="mb-3 h-10 w-10 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V4m0 0L8 8m4-4l4 4"
          />
        </svg>
        <p className="text-sm font-medium text-gray-600">
          Drag & drop or <span className="text-blue-600 underline">browse</span>
        </p>
        <p className="mt-1 text-xs text-gray-400">Accepted formats: .csv, .json</p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.json"
          className="hidden"
          onChange={onInputChange}
        />
      </div>

      {/* File error */}
      {fileError && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
          {fileError}
        </p>
      )}

      {/* Selected file */}
      {file && (
        <div className="flex items-center justify-between rounded-lg border bg-white px-4 py-3 text-sm text-gray-700 shadow-sm">
          <span className="font-medium">{file.name}</span>
          <button onClick={onReset} className="text-gray-400 hover:text-red-500">
            &#x2715;
          </button>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={onSubmit}
        disabled={!file || loading}
        className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "Uploading..." : "Upload File"}
      </button>

      {/* Submit error */}
      {submitError && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
          {submitError}
        </p>
      )}

      {/* Success summary */}
      {result && (
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

          {/* Validation errors */}
          {result.errors.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold text-red-600">
                {result.errors.length} validation error
                {result.errors.length > 1 ? "s" : ""}
              </p>
              <ul className="max-h-48 overflow-y-auto space-y-1 rounded-lg bg-red-50 p-3">
                {result.errors.map((err, i) => (
                  <li key={i} className="text-xs text-red-700">
                    {err.row != null && (
                      <span className="font-semibold">Row {err.row}: </span>
                    )}
                    {err.field && (
                      <span className="font-semibold">[{err.field}] </span>
                    )}
                    {err.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BulkImportPage;
