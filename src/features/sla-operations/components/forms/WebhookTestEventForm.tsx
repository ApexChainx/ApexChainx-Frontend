/** ApexChain Network Operations Intelligence Platform */
"use client";

import { useState, type FormEvent } from "react";

/** Webhook test event form (Issue #954). Validates JSON payload locally; emits parsed payload via onSubmit. */
export interface WebhookTestEventInput {
  eventType: string;
  endpointUrl: string;
  payload: Record<string, unknown>;
}

export interface WebhookTestEventFormProps {
  eventTypes?: string[];
  onSubmit: (input: WebhookTestEventInput) => void;
  isSubmitting?: boolean;
}

type Errors = { eventType?: string; endpointUrl?: string; payload?: string };

export function WebhookTestEventForm({
  eventTypes = ["outage.created", "outage.resolved", "sla.breached", "payment.settled"],
  onSubmit,
  isSubmitting = false,
}: WebhookTestEventFormProps) {
  const [eventType, setEventType] = useState("");
  const [endpointUrl, setEndpointUrl] = useState("");
  const [payloadText, setPayloadText] = useState("{}");
  const [errors, setErrors] = useState<Errors>({});

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next: Errors = {};
    let payload: Record<string, unknown> = {};

    if (!eventTypes.includes(eventType)) next.eventType = "Select an event type.";

    try {
      const url = new URL(endpointUrl.trim());
      if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("protocol");
    } catch {
      next.endpointUrl = "Enter a valid http(s) URL.";
    }

    try {
      const parsed: unknown = JSON.parse(payloadText);
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        next.payload = "Payload must be a JSON object.";
      } else {
        payload = parsed as Record<string, unknown>;
      }
    } catch {
      next.payload = "Payload is not valid JSON.";
    }

    setErrors(next);
    if (Object.keys(next).length === 0) onSubmit({ eventType, endpointUrl: endpointUrl.trim(), payload });
  };

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Webhook test event" className="space-y-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="webhook-test-event-type">Event type</label>
        <select
          id="webhook-test-event-type"
          value={eventType}
          onChange={(e) => setEventType(e.target.value)}
          aria-invalid={errors.eventType ? true : undefined}
          aria-describedby={errors.eventType ? "webhook-test-event-type-error" : undefined}
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value="">Select...</option>
          {eventTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        {errors.eventType && <p id="webhook-test-event-type-error" role="alert" className="text-xs">{errors.eventType}</p>}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="webhook-test-endpoint">Endpoint URL</label>
        <input
          id="webhook-test-endpoint"
          type="url"
          value={endpointUrl}
          onChange={(e) => setEndpointUrl(e.target.value)}
          aria-invalid={errors.endpointUrl ? true : undefined}
          aria-describedby="webhook-test-endpoint-desc"
          className="rounded-md border px-3 py-2 text-sm"
        />
        <p id="webhook-test-endpoint-desc" role={errors.endpointUrl ? "alert" : undefined} className="text-xs">
          {errors.endpointUrl ?? "Where the test event will be described as delivered."}
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="webhook-test-payload">Payload (JSON)</label>
        <textarea
          id="webhook-test-payload"
          rows={6}
          value={payloadText}
          onChange={(e) => setPayloadText(e.target.value)}
          aria-invalid={errors.payload ? true : undefined}
          aria-describedby="webhook-test-payload-desc"
          className="rounded-md border px-3 py-2 font-mono text-sm"
        />
        <p id="webhook-test-payload-desc" role={errors.payload ? "alert" : undefined} className="text-xs">
          {errors.payload ?? "A JSON object sent as the event body."}
        </p>
      </div>
      <button type="submit" disabled={isSubmitting} className="rounded-md border px-3 py-2 text-sm">
        {isSubmitting ? "Sending..." : "Send test event"}
      </button>
    </form>
  );
}
