/** ApexChain Network Operations Intelligence Platform */
"use client";

import { useState, type FormEvent } from "react";

export interface PaymentFilterValues {
  search: string;
  status: string;
  method: string;
}

export interface PaymentFilterFormProps {
  value: PaymentFilterValues;
  onChange: (value: PaymentFilterValues) => void;
  onSubmit: (value: PaymentFilterValues) => void;
}

const PAYMENT_STATUSES = ["", "pending", "settled", "failed", "refunded"];
const PAYMENT_METHODS = ["", "wallet", "card", "bank", "escrow"];
const MAX_SEARCH = 100;

export function validatePaymentFilter(
  v: PaymentFilterValues,
): Partial<Record<keyof PaymentFilterValues, string>> {
  const errors: Partial<Record<keyof PaymentFilterValues, string>> = {};
  if (v.search.length > MAX_SEARCH) errors.search = `Search must be ${MAX_SEARCH} characters or fewer.`;
  if (!PAYMENT_STATUSES.includes(v.status)) errors.status = "Select a valid status.";
  if (!PAYMENT_METHODS.includes(v.method)) errors.method = "Select a valid payment method.";
  return errors;
}

/** Filter form for settlement/payment operation views. */
export function PaymentFilterForm({ value, onChange, onSubmit }: PaymentFilterFormProps) {
  const [errors, setErrors] = useState<ReturnType<typeof validatePaymentFilter>>({});
  const set = (patch: Partial<PaymentFilterValues>) => onChange({ ...value, ...patch });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = validatePaymentFilter(value);
    setErrors(next);
    if (Object.keys(next).length === 0) onSubmit(value);
  };

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Payment filters" className="grid gap-3 sm:grid-cols-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="payment-filter-search">Search</label>
        <input
          id="payment-filter-search"
          value={value.search}
          onChange={(e) => set({ search: e.target.value })}
          aria-invalid={errors.search ? "true" : undefined}
          aria-describedby={errors.search ? "payment-filter-search-error" : undefined}
          className="rounded border px-2 py-1"
        />
        {errors.search ? <p id="payment-filter-search-error" className="text-sm text-red-600">{errors.search}</p> : null}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="payment-filter-status">Status</label>
        <select
          id="payment-filter-status"
          value={value.status}
          onChange={(e) => set({ status: e.target.value })}
          aria-invalid={errors.status ? "true" : undefined}
          aria-describedby={errors.status ? "payment-filter-status-error" : undefined}
          className="rounded border px-2 py-1"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="settled">Settled</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
        {errors.status ? <p id="payment-filter-status-error" className="text-sm text-red-600">{errors.status}</p> : null}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="payment-filter-method">Method</label>
        <select
          id="payment-filter-method"
          value={value.method}
          onChange={(e) => set({ method: e.target.value })}
          aria-invalid={errors.method ? "true" : undefined}
          aria-describedby={errors.method ? "payment-filter-method-error" : undefined}
          className="rounded border px-2 py-1"
        >
          <option value="">All methods</option>
          <option value="wallet">Wallet</option>
          <option value="card">Card</option>
          <option value="bank">Bank</option>
          <option value="escrow">Escrow</option>
        </select>
        {errors.method ? <p id="payment-filter-method-error" className="text-sm text-red-600">{errors.method}</p> : null}
      </div>
      <div className="sm:col-span-3">
        <button type="submit" className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white">
          Apply filters
        </button>
      </div>
    </form>
  );
}

export interface WebhookFilterValues {
  event: string;
  status: string;
  endpoint: string;
}

export interface WebhookFilterFormProps {
  value: WebhookFilterValues;
  onChange: (value: WebhookFilterValues) => void;
  onSubmit: (value: WebhookFilterValues) => void;
}

const WEBHOOK_STATUSES = ["", "active", "paused", "failed"];

export function validateWebhookFilter(
  v: WebhookFilterValues,
): Partial<Record<keyof WebhookFilterValues, string>> {
  const errors: Partial<Record<keyof WebhookFilterValues, string>> = {};
  if (v.event.length > 80) errors.event = "Event must be 80 characters or fewer.";
  if (v.endpoint.length > 200) errors.endpoint = "Endpoint must be 200 characters or fewer.";
  if (!WEBHOOK_STATUSES.includes(v.status)) errors.status = "Select a valid status.";
  return errors;
}

/** Filter form for SLA operations webhooks. */
export function WebhookFilterForm({ value, onChange, onSubmit }: WebhookFilterFormProps) {
  const [errors, setErrors] = useState<ReturnType<typeof validateWebhookFilter>>({});
  const set = (patch: Partial<WebhookFilterValues>) => onChange({ ...value, ...patch });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = validateWebhookFilter(value);
    setErrors(next);
    if (Object.keys(next).length === 0) onSubmit(value);
  };

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Webhook filters" className="grid gap-3 sm:grid-cols-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="webhook-filter-event">Event</label>
        <input
          id="webhook-filter-event"
          value={value.event}
          onChange={(e) => set({ event: e.target.value })}
          aria-invalid={errors.event ? "true" : undefined}
          aria-describedby={errors.event ? "webhook-filter-event-error" : undefined}
          className="rounded border px-2 py-1"
        />
        {errors.event ? <p id="webhook-filter-event-error" className="text-sm text-red-600">{errors.event}</p> : null}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="webhook-filter-status">Status</label>
        <select
          id="webhook-filter-status"
          value={value.status}
          onChange={(e) => set({ status: e.target.value })}
          aria-invalid={errors.status ? "true" : undefined}
          aria-describedby={errors.status ? "webhook-filter-status-error" : undefined}
          className="rounded border px-2 py-1"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="failed">Failed</option>
        </select>
        {errors.status ? <p id="webhook-filter-status-error" className="text-sm text-red-600">{errors.status}</p> : null}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="webhook-filter-endpoint">Endpoint</label>
        <input
          id="webhook-filter-endpoint"
          value={value.endpoint}
          onChange={(e) => set({ endpoint: e.target.value })}
          aria-invalid={errors.endpoint ? "true" : undefined}
          aria-describedby={errors.endpoint ? "webhook-filter-endpoint-error" : undefined}
          className="rounded border px-2 py-1"
        />
        {errors.endpoint ? <p id="webhook-filter-endpoint-error" className="text-sm text-red-600">{errors.endpoint}</p> : null}
      </div>
      <div className="sm:col-span-3">
        <button type="submit" className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white">
          Apply filters
        </button>
      </div>
    </form>
  );
}

export default PaymentFilterForm;
