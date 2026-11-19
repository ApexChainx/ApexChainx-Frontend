/** ApexChain Network Operations Intelligence Platform */
"use client";

import { useId, useMemo, useState, type FormEvent } from "react";

/**
 * Bulk import mapping form (Issue #955).
 *
 * Lets an operator map the columns found in an uploaded file to the outage
 * fields the import understands, and choose how duplicates are handled and
 * whether to run as a dry run. It is presentational: no file parsing and no
 * API calls. It emits a validated `BulkImportMappingConfig` through
 * `onSubmit`.
 *
 * Validation (also exported as `validateBulkImportMapping`):
 * - every required target field must be mapped;
 * - a mapped column must exist in the file's headers;
 * - one column cannot feed two target fields.
 */

/** Target fields the bulk outage import accepts. */
export interface BulkImportTargetField {
  name: string;
  label: string;
  description: string;
  required: boolean;
}

export const BULK_IMPORT_TARGET_FIELDS: readonly BulkImportTargetField[] = [
  { name: "service_id", label: "Service ID", description: "Identifier of the affected service.", required: true },
  { name: "start_time", label: "Start time", description: "When the outage began.", required: true },
  { name: "end_time", label: "End time", description: "When the outage ended.", required: true },
  { name: "severity", label: "Severity", description: "low, medium, high or critical.", required: false },
  { name: "status", label: "Status", description: "Lifecycle status of the outage.", required: false },
  { name: "site_name", label: "Site name", description: "Human-readable site name.", required: false },
  { name: "description", label: "Description", description: "Free-text summary.", required: false },
  { name: "assigned_to", label: "Assigned to", description: "Operator responsible for the outage.", required: false },
];

/** How rows that match an existing outage are treated. */
export type DuplicateHandling = "skip" | "update" | "fail";

/** Mapping from target field name to the source column it is read from. */
export type BulkImportMapping = Record<string, string>;

export interface BulkImportMappingConfig {
  /** Only mapped fields are present. */
  mapping: BulkImportMapping;
  onDuplicate: DuplicateHandling;
  dryRun: boolean;
}

export interface BulkImportMappingFormProps {
  /** Column headers found in the uploaded file. */
  sourceHeaders: readonly string[];
  /** Mapping to start from. Defaults to `suggestBulkImportMapping(sourceHeaders)`. */
  initialMapping?: BulkImportMapping | undefined;
  initialOnDuplicate?: DuplicateHandling | undefined;
  /** Dry run is on by default so nothing is changed until the operator opts in. */
  initialDryRun?: boolean | undefined;
  onSubmit: (config: BulkImportMappingConfig) => void;
  onCancel?: (() => void) | undefined;
  submitLabel?: string | undefined;
}

/** Per-field errors keyed by target field name. */
export type BulkImportMappingErrors = Record<string, string>;

const DUPLICATE_OPTIONS: readonly { value: DuplicateHandling; label: string; description: string }[] = [
  { value: "skip", label: "Skip", description: "Leave the existing outage unchanged." },
  { value: "update", label: "Update", description: "Overwrite the existing outage with the row's values." },
  { value: "fail", label: "Fail", description: "Reject the import if any row matches an existing outage." },
];

/** Lower-case a header and collapse spaces, dashes and dots to underscores. */
function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[\s.-]+/g, "_");
}

/**
 * Suggest a mapping by matching headers to target field names, ignoring case,
 * spaces and dashes ("Start Time" maps to `start_time`). A header is used for
 * at most one field, and the first match wins.
 */
export function suggestBulkImportMapping(sourceHeaders: readonly string[]): BulkImportMapping {
  const mapping: BulkImportMapping = {};
  const used = new Set<string>();
  for (const field of BULK_IMPORT_TARGET_FIELDS) {
    const match = sourceHeaders.find(
      (header) => !used.has(header) && normalizeHeader(header) === field.name,
    );
    if (match !== undefined) {
      mapping[field.name] = match;
      used.add(match);
    }
  }
  return mapping;
}

/** Validate a mapping against the file's headers. Returns `{}` when valid. */
export function validateBulkImportMapping(
  mapping: BulkImportMapping,
  sourceHeaders: readonly string[],
): BulkImportMappingErrors {
  const errors: BulkImportMappingErrors = {};
  const owner = new Map<string, string>();

  for (const field of BULK_IMPORT_TARGET_FIELDS) {
    const column = mapping[field.name];
    if (column === undefined || column === "") {
      if (field.required) {
        errors[field.name] = `${field.label} is required. Choose the column that holds it.`;
      }
      continue;
    }
    if (!sourceHeaders.includes(column)) {
      errors[field.name] = `Column "${column}" is not in the uploaded file.`;
      continue;
    }
    const other = owner.get(column);
    if (other !== undefined) {
      errors[field.name] = `Column "${column}" is already used for ${other}.`;
      continue;
    }
    owner.set(column, field.label);
  }
  return errors;
}

/** Drop empty entries so only mapped fields remain. */
function compactMapping(mapping: BulkImportMapping): BulkImportMapping {
  return Object.fromEntries(Object.entries(mapping).filter(([, column]) => column !== ""));
}

export function BulkImportMappingForm({
  sourceHeaders,
  initialMapping,
  initialOnDuplicate = "skip",
  initialDryRun = true,
  onSubmit,
  onCancel,
  submitLabel = "Continue",
}: BulkImportMappingFormProps) {
  const baseId = useId();
  const [mapping, setMapping] = useState<BulkImportMapping>(
    () => initialMapping ?? suggestBulkImportMapping(sourceHeaders),
  );
  const [onDuplicate, setOnDuplicate] = useState<DuplicateHandling>(initialOnDuplicate);
  const [dryRun, setDryRun] = useState(initialDryRun);
  const [submitted, setSubmitted] = useState(false);

  const hasHeaders = sourceHeaders.length > 0;

  // Errors appear after the first submit attempt and then stay in step with
  // edits, so a message disappears as soon as the field is fixed.
  const liveErrors = useMemo<BulkImportMappingErrors>(
    () => (submitted ? validateBulkImportMapping(mapping, sourceHeaders) : {}),
    [submitted, mapping, sourceHeaders],
  );
  const errorCount = Object.keys(liveErrors).length;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = validateBulkImportMapping(mapping, sourceHeaders);
    setSubmitted(true);
    if (Object.keys(next).length > 0) {
      return;
    }
    onSubmit({ mapping: compactMapping(mapping), onDuplicate, dryRun });
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label="Bulk import column mapping"
      className="flex flex-col gap-4"
    >
      {!hasHeaders ? (
        <p role="alert" className="text-sm">
          No columns were found in the file. Upload a file with a header row to map its columns.
        </p>
      ) : null}

      {submitted && errorCount > 0 ? (
        <p role="alert" className="text-sm font-medium">
          {errorCount === 1 ? "1 field needs attention." : `${errorCount} fields need attention.`}
        </p>
      ) : null}

      <fieldset className="flex flex-col gap-3">
        <legend className="text-base font-semibold">Map columns</legend>
        {BULK_IMPORT_TARGET_FIELDS.map((field) => {
          const id = `${baseId}-${field.name}`;
          const error = liveErrors[field.name];
          return (
            <div key={field.name} className="flex flex-col gap-1">
              <label htmlFor={id}>
                {field.label}
                {field.required ? (
                  <span aria-hidden="true"> *</span>
                ) : null}
                {field.required ? <span className="sr-only"> (required)</span> : null}
              </label>
              <select
                id={id}
                value={mapping[field.name] ?? ""}
                disabled={!hasHeaders}
                aria-required={field.required}
                aria-invalid={error ? true : undefined}
                aria-describedby={`${id}-desc`}
                onChange={(event) => setMapping({ ...mapping, [field.name]: event.target.value })}
                className="rounded-md border px-3 py-2 text-sm"
              >
                <option value="">{field.required ? "Choose a column" : "Not mapped"}</option>
                {sourceHeaders.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
              <p id={`${id}-desc`} role={error ? "alert" : undefined} className="text-xs">
                {error ?? field.description}
              </p>
            </div>
          );
        })}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-base font-semibold">When a row matches an existing outage</legend>
        {DUPLICATE_OPTIONS.map((option) => {
          const id = `${baseId}-dup-${option.value}`;
          return (
            <div key={option.value} className="flex items-start gap-2">
              <input
                id={id}
                type="radio"
                name={`${baseId}-duplicates`}
                value={option.value}
                checked={onDuplicate === option.value}
                aria-describedby={`${id}-desc`}
                onChange={() => setOnDuplicate(option.value)}
              />
              <div className="flex flex-col">
                <label htmlFor={id}>{option.label}</label>
                <span id={`${id}-desc`} className="text-xs">
                  {option.description}
                </span>
              </div>
            </div>
          );
        })}
      </fieldset>

      <div className="flex items-start gap-2">
        <input
          id={`${baseId}-dry-run`}
          type="checkbox"
          checked={dryRun}
          aria-describedby={`${baseId}-dry-run-desc`}
          onChange={(event) => setDryRun(event.target.checked)}
        />
        <div className="flex flex-col">
          <label htmlFor={`${baseId}-dry-run`}>Dry run</label>
          <span id={`${baseId}-dry-run-desc`} className="text-xs">
            Validate and preview the import without saving anything.
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={!hasHeaders} className="rounded-md border px-3 py-2 text-sm">
          {submitLabel}
        </button>
        {onCancel ? (
          <button type="button" onClick={onCancel} className="rounded-md border px-3 py-2 text-sm">
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}

export default BulkImportMappingForm;
