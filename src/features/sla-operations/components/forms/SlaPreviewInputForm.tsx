/** ApexChain Network Operations Intelligence Platform */
"use client";

import { useState, type FormEvent } from "react";

/** Local SLA preview input form (Issue #953). No API wiring; emits parsed numbers via onSubmit. */
export interface SlaPreviewInput {
  outageMinutes: number;
  thresholdMinutes: number;
  penaltyPercent: number;
}

export interface SlaPreviewInputFormProps {
  initialValues?: Partial<Record<keyof SlaPreviewInput, string>>;
  onSubmit: (input: SlaPreviewInput) => void;
}

type Raw = Record<keyof SlaPreviewInput, string>;
type Errors = Partial<Record<keyof SlaPreviewInput, string>>;

const FIELDS: { name: keyof SlaPreviewInput; label: string; hint: string; max?: number }[] = [
  { name: "outageMinutes", label: "Outage duration (minutes)", hint: "Total downtime, 0 or more." },
  { name: "thresholdMinutes", label: "SLA threshold (minutes)", hint: "Allowed downtime before penalty." },
  { name: "penaltyPercent", label: "Penalty (%)", hint: "Between 0 and 100.", max: 100 },
];

export function validateSlaPreviewInput(raw: Raw): Errors {
  const errors: Errors = {};
  for (const f of FIELDS) {
    const text = raw[f.name].trim();
    const n = Number(text);
    if (text === "" || !Number.isFinite(n)) errors[f.name] = `${f.label} is required and must be a number.`;
    else if (n < 0) errors[f.name] = `${f.label} cannot be negative.`;
    else if (f.max !== undefined && n > f.max) errors[f.name] = `${f.label} cannot exceed ${f.max}.`;
  }
  return errors;
}

export function SlaPreviewInputForm({ initialValues, onSubmit }: SlaPreviewInputFormProps) {
  const [raw, setRaw] = useState<Raw>({
    outageMinutes: "",
    thresholdMinutes: "",
    penaltyPercent: "",
    ...initialValues,
  });
  const [errors, setErrors] = useState<Errors>({});

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = validateSlaPreviewInput(raw);
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    onSubmit({
      outageMinutes: Number(raw.outageMinutes),
      thresholdMinutes: Number(raw.thresholdMinutes),
      penaltyPercent: Number(raw.penaltyPercent),
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="SLA preview inputs" className="grid gap-3 sm:grid-cols-3">
      {FIELDS.map((f) => (
        <div key={f.name} className="flex flex-col gap-1">
          <label htmlFor={`sla-preview-${f.name}`}>{f.label}</label>
          <input
            id={`sla-preview-${f.name}`}
            type="text"
            inputMode="decimal"
            value={raw[f.name]}
            onChange={(e) => setRaw({ ...raw, [f.name]: e.target.value })}
            aria-invalid={errors[f.name] ? true : undefined}
            aria-describedby={`sla-preview-${f.name}-desc`}
            className="rounded-md border px-3 py-2 text-sm"
          />
          <p id={`sla-preview-${f.name}-desc`} role={errors[f.name] ? "alert" : undefined} className="text-xs">
            {errors[f.name] ?? f.hint}
          </p>
        </div>
      ))}
      <div className="sm:col-span-3">
        <button type="submit" className="rounded-md border px-3 py-2 text-sm">Preview</button>
      </div>
    </form>
  );
}
