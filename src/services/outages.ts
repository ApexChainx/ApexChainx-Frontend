import { api } from "@/lib/api";
import {
  Outage,
  OutageCreate,
  OutageUpdate,
  PaginatedOutages,
  ResolveOutagePayload,
  ResolveOutageResponse,
} from "@/types/outages";

export async function listOutages(): Promise<Outage[]> {
  const res = await api.get<PaginatedOutages>("/outages");
  return res.data.items;
}

export async function getOutages(params: {
  page?: number;
  page_size?: number;
  severity?: string;
  status?: string;
}): Promise<PaginatedOutages> {
  const res = await api.get<PaginatedOutages>("/outages", { params });
  return res.data;
}

export async function getOutage(id: string): Promise<Outage> {
  const res = await api.get<Outage>(`/outages/${id}`);
  return res.data;
}

export async function createOutage(payload: OutageCreate): Promise<Outage> {
  const res = await api.post<Outage>("/outages", payload);
  return res.data;
}

export async function updateOutage(
  id: string,
  payload: OutageUpdate,
): Promise<Outage> {
  const res = await api.put<Outage>(`/outages/${id}`, payload);
  return res.data;
}

export async function deleteOutage(id: string): Promise<{ message: string }> {
  const res = await api.delete<{ message: string }>(`/outages/${id}`);
  return res.data;
}

export async function resolveOutage(
  id: string,
  payload: ResolveOutagePayload,
): Promise<ResolveOutageResponse> {
  const res = await api.post<ResolveOutageResponse>(`/outages/${id}/resolve`, payload);
  return res.data;
}
