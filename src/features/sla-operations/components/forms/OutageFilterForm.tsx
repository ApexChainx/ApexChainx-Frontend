/** ApexChain Network Operations Intelligence Platform */
"use client";

import { useState, type FormEvent } from "react";

/** Outage filter form (Issue #952). Controlled via value/onChange; validates on submit. */
export interface OutageFilterValues {
  search: string;
  severity: string;
  status: string;
}

export interface OutageFilterFormProps {
  value: OutageFilterValues;
  onChange: (value: OutageFilterValues) => void;
  onSubmit: (value: OutageFilterValues) => void;
}

const SEVERITIES = ["", "critical", "major", "minor"];
const STATUSES = ["", "open", "investigating", "resolved"];
const MAX_SEARCH = 100;

export function validateOutageFilter(v: OutageFilterValues): Partial<Record<keyof OutageFilterValues, string>> {
  const errors: Partial<Record<keyof OutageFilterValues, string>> = {};
  if (v.search.length > MAX_SEARCH) errors.search = `Search must be ${MAX_SEARCH} characters or fewer.`;
  if (!SEVERITIES.includes(v.severity)) errors.severity = "Select a valid severity.";
  if (!STATUSES.includes(v.status)) errors.status = "Select a valid status.";
  return errors;
}

export function OutageFilterForm({ value, onChange, onSubmit }: OutageFilterFormProps) {
  const [errors, setErrors] = useState<ReturnType<typeof validateOutageFilter>>({});
  const set = (patch: Partial<OutageFilterValues>) => onChange({ ...value, ...patch });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = validateOutageFilter(value);
    setErrors(next);
    if (Object.keys(next).length === 0) onSubmit(value);
  };

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Outage filters" className="grid gap-3 sm:grid-cols-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="outage-filter-search">Search</label>
        <input
          id="outage-filter-search"
          value={value.search}
          onChange={(e) => set({ search: e.target.value })}
          aria-invalid={errors.search ? true : undefined}
          aria-describedby="outage-filter-search-hint"
          className="rounded-md border px-3 py-2 text-sm"
        />
        <p id="outage-filter-search-hint" role={errors.search ? "alert" : undefined} className="text-xs">
          {errors.search ?? "Site, outage ID or keyword."}
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="outage-filter-severity">Severity</label>
        <select
          id="outage-filter-severity"
          value={value.severity}
          onChange={(e) => set({ severity: e.target.value })}
          aria-invalid={errors.severity ? true : undefined}
          aria-describedby={errors.severity ? "outage-filter-severity-error" : undefined}
          className="rounded-md border px-3 py-2 text-sm"
        >
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>{s || "All"}</option>
          ))}
        </select>
        {errors.severity && <p id="outage-filter-severity-error" role="alert" className="text-xs">{errors.severity}</p>}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="outage-filter-status">Status</label>
        <select
          id="outage-filter-status"
          value={value.status}
          onChange={(e) => set({ status: e.target.value })}
          aria-invalid={errors.status ? true : undefined}
          aria-describedby={errors.status ? "outage-filter-status-error" : undefined}
          className="rounded-md border px-3 py-2 text-sm"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s || "All"}</option>
          ))}
        </select>
        {errors.status && <p id="outage-filter-status-error" role="alert" className="text-xs">{errors.status}</p>}
      </div>
      <div className="sm:col-span-3">
        <button type="submit" className="rounded-md border px-3 py-2 text-sm">Apply filters</button>
      </div>
    </form>
  );
}
