/** ApexChain Network Operations Intelligence Platform */
"use client";

import { useState, type FormEvent } from "react";

export interface DateRangeFilterValues {
  from: string;
  to: string;
}

export interface DateRangeFilterFormProps {
  value: DateRangeFilterValues;
  onChange: (value: DateRangeFilterValues) => void;
  onSubmit: (value: DateRangeFilterValues) => void;
}

function isValidDate(value: string): boolean {
  return value === "" || !Number.isNaN(Date.parse(value));
}

export function validateDateRangeFilter(
  v: DateRangeFilterValues,
): Partial<Record<keyof DateRangeFilterValues, string>> {
  const errors: Partial<Record<keyof DateRangeFilterValues, string>> = {};
  if (!isValidDate(v.from)) errors.from = "Enter a valid start date.";
  if (!isValidDate(v.to)) errors.to = "Enter a valid end date.";
  if (v.from && v.to && new Date(v.from) > new Date(v.to)) {
    errors.to = "End date must be on or after start date.";
  }
  return errors;
}

/** Filter form for selecting an SLA operations date range. */
export function DateRangeFilterForm({ value, onChange, onSubmit }: DateRangeFilterFormProps) {
  const [errors, setErrors] = useState<ReturnType<typeof validateDateRangeFilter>>({});
  const set = (patch: Partial<DateRangeFilterValues>) => onChange({ ...value, ...patch });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = validateDateRangeFilter(value);
    setErrors(next);
    if (Object.keys(next).length === 0) onSubmit(value);
  };

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Date range filter" className="grid gap-3 sm:grid-cols-2">
      <div className="flex flex-col gap-1">
        <label htmlFor="date-range-from">From</label>
        <input
          id="date-range-from"
          type="date"
          value={value.from}
          onChange={(e) => set({ from: e.target.value })}
          aria-invalid={errors.from ? "true" : undefined}
          aria-describedby={errors.from ? "date-range-from-error" : undefined}
          className="rounded border px-2 py-1"
        />
        {errors.from ? <p id="date-range-from-error" className="text-sm text-red-600">{errors.from}</p> : null}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="date-range-to">To</label>
        <input
          id="date-range-to"
          type="date"
          value={value.to}
          onChange={(e) => set({ to: e.target.value })}
          aria-invalid={errors.to ? "true" : undefined}
          aria-describedby={errors.to ? "date-range-to-error" : undefined}
          className="rounded border px-2 py-1"
        />
        {errors.to ? <p id="date-range-to-error" className="text-sm text-red-600">{errors.to}</p> : null}
      </div>
      <div className="sm:col-span-2">
        <button type="submit" className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white">
          Apply range
        </button>
      </div>
    </form>
  );
}

export type ExportFormat = "csv" | "json";

export interface ExportOptionsValues {
  format: ExportFormat;
  includeMetadata: boolean;
  fileName: string;
}

export interface ExportOptionsFormProps {
  value: ExportOptionsValues;
  onChange: (value: ExportOptionsValues) => void;
  onSubmit: (value: ExportOptionsValues) => void;
}

export function validateExportOptions(
  v: ExportOptionsValues,
): Partial<Record<keyof ExportOptionsValues, string>> {
  const errors: Partial<Record<keyof ExportOptionsValues, string>> = {};
  if (!v.format || !["csv", "json"].includes(v.format)) errors.format = "Select a valid format.";
  if (!v.fileName.trim()) errors.fileName = "File name is required.";
  if (v.fileName.length > 80) errors.fileName = "File name must be 80 characters or fewer.";
  return errors;
}

/** Form for choosing SLA operations export options. */
export function ExportOptionsForm({ value, onChange, onSubmit }: ExportOptionsFormProps) {
  const [errors, setErrors] = useState<ReturnType<typeof validateExportOptions>>({});
  const set = (patch: Partial<ExportOptionsValues>) => onChange({ ...value, ...patch });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = validateExportOptions(value);
    setErrors(next);
    if (Object.keys(next).length === 0) onSubmit(value);
  };

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Export options" className="grid gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="export-format">Format</label>
        <select
          id="export-format"
          value={value.format}
          onChange={(e) => set({ format: e.target.value as ExportFormat })}
          aria-invalid={errors.format ? "true" : undefined}
          aria-describedby={errors.format ? "export-format-error" : undefined}
          className="rounded border px-2 py-1"
        >
          <option value="csv">CSV</option>
          <option value="json">JSON</option>
        </select>
        {errors.format ? <p id="export-format-error" className="text-sm text-red-600">{errors.format}</p> : null}
      </div>
      <div className="flex items-center gap-2">
        <input
          id="export-include-metadata"
          type="checkbox"
          checked={value.includeMetadata}
          onChange={(e) => set({ includeMetadata: e.target.checked })}
        />
        <label htmlFor="export-include-metadata">Include metadata</label>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="export-file-name">File name</label>
        <input
          id="export-file-name"
          value={value.fileName}
          onChange={(e) => set({ fileName: e.target.value })}
          aria-invalid={errors.fileName ? "true" : undefined}
          aria-describedby={errors.fileName ? "export-file-name-error" : undefined}
          className="rounded border px-2 py-1"
        />
        {errors.fileName ? <p id="export-file-name-error" className="text-sm text-red-600">{errors.fileName}</p> : null}
      </div>
      <div>
        <button type="submit" className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white">Export</button>
      </div>
    </form>
  );
}

export default DateRangeFilterForm;
