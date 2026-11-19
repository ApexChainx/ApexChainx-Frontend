/** ApexChain Network Operations Intelligence Platform */
import type { ReactElement } from "react";
import type {
  WebhookDeliveryAttempt,
  WebhookEndpointHealth,
} from "../types/webhook-monitoring";

export interface WebhookEndpointHealthPanelProps {
  endpoints: WebhookEndpointHealth[];
  /** Recent delivery attempts across endpoints. */
  deliveries?: WebhookDeliveryAttempt[];
  isLoading?: boolean;
  error?: string | null;
}

/** Panel listing endpoint health plus recent delivery outcomes per endpoint. */
export function WebhookEndpointHealthPanel({
  endpoints,
  deliveries = [],
  isLoading = false,
  error = null,
}: WebhookEndpointHealthPanelProps): ReactElement {
  return (
    <section
      aria-labelledby="webhook-health-heading"
      aria-busy={isLoading}
      className="rounded-lg border p-4"
    >
      <h2 id="webhook-health-heading" className="text-base font-semibold">
        Webhook endpoint health
      </h2>
      {isLoading ? (
        <p role="status" className="mt-3 text-sm">Loading webhook health...</p>
      ) : error ? (
        <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>
      ) : endpoints.length === 0 ? (
        <p className="mt-3 text-sm">No webhook endpoints configured.</p>
      ) : (
        <ul className="mt-3 divide-y">
          {endpoints.map((e) => {
            const own = deliveries.filter((d) => d.endpointId === e.endpointId);
            const delivered = own.filter((d) => d.status === "delivered").length;
            return (
              <li key={e.endpointId} className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="break-all text-sm">{e.url}</span>
                <span className="text-xs">
                  <strong className="capitalize">{e.status}</strong>
                  {` · ${e.successRate}% success · ${e.consecutiveFailures} consecutive failures`}
                  {e.averageLatencyMs != null ? ` · ${e.averageLatencyMs} ms` : ""}
                  {own.length > 0 ? ` · ${delivered}/${own.length} recent delivered` : ""}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default WebhookEndpointHealthPanel;
