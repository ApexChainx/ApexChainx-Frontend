import { api } from "@/lib/api";
import type {
  Webhook,
  WebhookDelivery,
  CreateWebhookPayload,
  UpdateWebhookPayload,
} from "@/types/webhook";

export const fetchWebhooks = async (): Promise<Webhook[]> => {
  const res = await api.get<Webhook[]>("/webhooks");
  return res.data;
};

export const createWebhook = async (payload: CreateWebhookPayload): Promise<Webhook> => {
  const res = await api.post<Webhook>("/webhooks", payload);
  return res.data;
};

export const updateWebhook = async (id: string, payload: UpdateWebhookPayload): Promise<Webhook> => {
  const res = await api.patch<Webhook>(`/webhooks/${id}`, payload);
  return res.data;
};

export const deleteWebhook = async (id: string): Promise<void> => {
  await api.delete(`/webhooks/${id}`);
};

export const fetchWebhookDeliveries = async (webhookId: string): Promise<WebhookDelivery[]> => {
  const res = await api.get<WebhookDelivery[]>(`/webhooks/${webhookId}/deliveries`);
  return res.data;
};

export const retryDelivery = async (webhookId: string, deliveryId: string): Promise<void> => {
  await api.post(`/webhooks/${webhookId}/deliveries/${deliveryId}/retry`);
};
