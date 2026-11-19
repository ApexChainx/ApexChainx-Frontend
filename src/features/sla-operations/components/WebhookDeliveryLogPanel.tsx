/** ApexChain Network Operations Intelligence Platform */
import type { WebhookDeliveryAttempt } from "../types/webhook-monitoring";

export interface WebhookDeliveryLogPanelProps {
  attempts: WebhookDeliveryAttempt[];
  isLoading?: boolean;
  error?: string | null;
  title?: string;
}

export function WebhookDeliveryLogPanel({
  attempts,
  isLoading = false,
  error = null,
  title = "Webhook delivery log",
}: WebhookDeliveryLogPanelProps) {
  const headingId = "webhook-delivery-log-heading";

  return (
    <section aria-labelledby={headingId} aria-busy={isLoading} className="rounded-lg border p-4">
      <h2 id={headingId} className="text-lg font-semibold">
        {title}
      </h2>
      {isLoading ? (
        <p role="status" className="mt-3 text-sm">
          Loading delivery attempts...
        </p>
      ) : error ? (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      ) : attempts.length === 0 ? (
        <p className="mt-3 text-sm">No webhook deliveries recorded.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr>
                <th scope="col" className="py-1 pr-3">Event</th>
                <th scope="col" className="py-1 pr-3">Status</th>
                <th scope="col" className="py-1 pr-3">Attempt</th>
                <th scope="col" className="py-1 pr-3">Response</th>
                <th scope="col" className="py-1 pr-3">Duration</th>
                <th scope="col" className="py-1">Attempted at</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="py-1 pr-3">{a.eventType}</td>
                  <td className="py-1 pr-3">{a.status}</td>
                  <td className="py-1 pr-3">
                    {a.retry.attempt}/{a.retry.maxAttempts}
                  </td>
                  <td className="py-1 pr-3">{a.responseCode ?? "-"}</td>
                  <td className="py-1 pr-3">
                    {a.durationMs == null ? "-" : `${a.durationMs} ms`}
                  </td>
                  <td className="py-1">
                    <time dateTime={a.attemptedAt}>{a.attemptedAt}</time>
                    {a.retry.lastError ? (
                      <span className="block text-xs text-red-600">{a.retry.lastError}</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
