/** ApexChain Network Operations Intelligence Platform */
export interface Webhook {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  created_at: string;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event: string;
  status: "success" | "failed" | "pending";
  response_code: number | null;
  created_at: string;
}

export interface CreateWebhookPayload {
  url: string;
  events: string[];
}

export interface UpdateWebhookPayload {
  url?: string;
  events?: string[];
  active?: boolean;
  /**
   * Issue #603 — the signing secret is generated client-side by
   * `WebhookSettings` and registered with the endpoint so the backend can
   * verify the HMAC-SHA256 signature it stamps on each delivery.
   */
  secret?: string;
}
