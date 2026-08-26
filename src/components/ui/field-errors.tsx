/** ApexChain Network Operations Intelligence Platform */
"use client";

interface FieldErrorsProps {
  /** Field-keyed validation errors, e.g. `{ site_name: ["String should have at least 1 character"] }` */
  errors?: Record<string, string[]> | undefined;
}

/**
 * Renders per-field validation errors derived from a FastAPI 422 response.
 * Composes inside an existing error container (list only); returns null when
 * there is nothing to render.
 */
export function FieldErrors({ errors }: FieldErrorsProps) {
  if (!errors) return null;

  const entries = Object.entries(errors);
  if (entries.length === 0) return null;

  return (
    <ul className="mt-2 list-disc space-y-1 pl-5">
      {entries.map(([field, messages]) => (
        <li key={field} className="text-sm text-red-600">
          <span className="font-medium">{field}</span>: {messages.join("; ")}
        </li>
      ))}
    </ul>
  );
}
