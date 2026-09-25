/** ApexChain Network Operations Intelligence Platform */
/**
 * Issue #569 — the backend owns outage identity.
 *
 * The create form used to mint its own primary key as `OUT-${Date.now()}` and
 * ship it in the POST body. That is racy (two operators submitting inside the
 * same millisecond collide) and it makes the id client-authoritative, so a
 * forged-but-well-formed `OUT-…` reference is accepted before the server has
 * validated anything. The canonical id now comes back from the create
 * response, and this builder produces the request body without one.
 *
 * Extracted from the page component so the submitted payload shape is
 * unit-testable without rendering the form.
 */

import type { OutageCreate, OutageStatus, Severity } from "@/types/outages";

/** Raw, string-valued form state as held by the new-outage page. */
export interface NewOutageFormState {
  site_name: string;
  site_id: string;
  severity: Severity;
  status: OutageStatus;
  /** `datetime-local` value, e.g. `2026-01-31T09:15`. */
  detected_at: string;
  description: string;
  /** Comma-separated, free text in the form. */
  affected_services: string;
  affected_subscribers: string;
  assigned_to: string;
}

/**
 * Build the `OutageCreate` body from the raw form state.
 *
 * Empty optional fields are omitted entirely rather than sent as `""`/`0`:
 * the API treats a present-but-empty string as a set value on some
 * serializers, which would blank fields the operator never touched.
 *
 * No `id` is produced — see the module comment.
 */
export function buildOutageCreatePayload(
  form: NewOutageFormState,
): OutageCreate {
  const affectedSubscribers = form.affected_subscribers.trim()
    ? Number.parseInt(form.affected_subscribers.trim(), 10)
    : undefined;

  return {
    site_name: form.site_name.trim(),
    site_id: form.site_id.trim() || undefined,
    severity: form.severity,
    status: form.status,
    detected_at: new Date(form.detected_at).toISOString(),
    description: form.description.trim(),
    affected_services: form.affected_services
      ? form.affected_services
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
    affected_subscribers: Number.isFinite(affectedSubscribers)
      ? affectedSubscribers
      : undefined,
    assigned_to: form.assigned_to.trim() || undefined,
  };
}
