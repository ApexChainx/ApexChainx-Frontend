/** ApexChain Network Operations Intelligence Platform */
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type {
  Webhook,
  WebhookDelivery,
  CreateWebhookPayload,
  UpdateWebhookPayload,
} from "@/types/webhook";

export const fetchWebhooks = async (): Promise<Webhook[]> => {
  const res = await api.get<Webhook[]>(ENDPOINTS.webhooks.base);
  return res.data;
};

export const createWebhook = async (payload: CreateWebhookPayload): Promise<Webhook> => {
  const res = await api.post<Webhook>(ENDPOINTS.webhooks.base, payload);
  return res.data;
};

export const updateWebhook = async (id: string, payload: UpdateWebhookPayload): Promise<Webhook> => {
  const res = await api.patch<Webhook>(ENDPOINTS.webhooks.byId(id), payload);
  return res.data;
};

export const deleteWebhook = async (id: string): Promise<void> => {
  await api.delete(ENDPOINTS.webhooks.byId(id));
};

export const fetchWebhookDeliveries = async (webhookId: string): Promise<WebhookDelivery[]> => {
  const res = await api.get<WebhookDelivery[]>(ENDPOINTS.webhooks.deliveries(webhookId));
  return res.data;
};

export const retryDelivery = async (webhookId: string, deliveryId: string): Promise<WebhookDelivery> => {
  const res = await api.post<WebhookDelivery>(ENDPOINTS.webhooks.retryDelivery(webhookId, deliveryId));
  return res.data;
};
