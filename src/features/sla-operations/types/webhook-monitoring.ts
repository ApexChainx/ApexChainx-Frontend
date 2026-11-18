/** ApexChain Network Operations Intelligence Platform */
/**
 * Webhook monitoring types (Issue #906).
 *
 * Contracts for endpoint health, delivery attempts/retries and the event feed
 * rendered by operations monitoring UIs. Status values are discriminants so
 * components can switch exhaustively on them.
 */

/** Overall health of a webhook endpoint. */
export type WebhookEndpointHealthStatus =
  | "healthy"
  | "degraded"
  | "down"
  | "unknown";

/** State of an individual webhook delivery attempt. */
export type WebhookDeliveryStatus =
  | "queued"
  | "delivering"
  | "delivered"
  | "failed"
  | "retrying"
  | "dead-lettered";

/** Health snapshot for a single webhook endpoint. */
export interface WebhookEndpointHealth {
  endpointId: string;
  url: string;
  status: WebhookEndpointHealthStatus;
  /** Consecutive failed deliveries leading up to this snapshot. */
  consecutiveFailures: number;
  /** ISO-8601 timestamp of the last successful delivery, when one exists. */
  lastSuccessAt?: string | null;
  /** ISO-8601 timestamp the health probe was last run. */
  lastCheckedAt: string;
  /** Rolling success rate over the recent window (0..100). */
  successRate: number;
  /** Average response latency in milliseconds, when measured. */
  averageLatencyMs?: number | null;
}

/** Retry metadata attached to a delivery attempt. */
export interface WebhookRetryMetadata {
  /** 1-based attempt number. */
  attempt: number;
  /** Maximum number of attempts allowed for the event. */
  maxAttempts: number;
  /** ISO-8601 timestamp of the next scheduled retry, if any. */
  nextRetryAt?: string | null;
  /** Error message from the most recent failed attempt. */
  lastError?: string | null;
}

/** One attempt to deliver a webhook event. */
export interface WebhookDeliveryAttempt {
  id: string;
  endpointId: string;
  /** Event type discriminator supplied by the backend, e.g. "outage.resolved". */
  eventType: string;
  status: WebhookDeliveryStatus;
  /** ISO-8601 timestamp the attempt started. */
  attemptedAt: string;
  durationMs?: number | null;
  /** HTTP status code received, when a response was returned. */
  responseCode?: number | null;
  retry: WebhookRetryMetadata;
}

/** Category of an item in the webhook event feed. */
export type WebhookEventFeedItemKind =
  | "delivery"
  | "retry"
  | "endpoint-health"
  | "configuration";

/** A single item in the webhook monitoring event feed. */
export interface WebhookEventFeedItem {
  id: string;
  kind: WebhookEventFeedItemKind;
  /** ISO-8601 timestamp the event was recorded. */
  timestamp: string;
  title: string;
  description?: string | undefined;
  endpointId?: string | undefined;
  deliveryId?: string | undefined;
}
