import { api } from "@/lib/api";
import { Outage, OutageCreate, OutageUpdate } from "@/types/outages";

export async function listOutages(): Promise<Outage[]> {
  const res = await api.get<Outage[]>("/outages");
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

export async function resolveOutage(id: string): Promise<Outage> {
  const res = await api.post<Outage>(`/outages/${id}/resolve`);
  return res.data;
}
