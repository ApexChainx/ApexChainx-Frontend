import { api } from "@/lib/api";
import type { SLAResult, SLADispute } from "@/types/sla";

export async function calculateSLA(params: {
  outage_id: string;
  severity: string;
  mttr_minutes: number;
}): Promise<SLAResult> {
  const res = await api.get<SLAResult>("/sla/calculate", {
    params,
  });
  return res.data;
}

export async function previewSLA(params: {
  severity: string;
  mttr_minutes: number;
}): Promise<SLAResult> {
  const res = await api.post<SLAResult>("/sla/preview", params);
  return res.data;
}

export async function getDisputes(outageId: string): Promise<SLADispute[]> {
  const res = await api.get<SLADispute[]>(`/sla/disputes`, { params: { outage_id: outageId } });
  return res.data;
}

export async function flagDispute(outageId: string, reason: string): Promise<SLADispute> {
  const res = await api.post<SLADispute>(`/sla/disputes`, { outage_id: outageId, reason });
  return res.data;
}

export async function resolveDispute(disputeId: string, action: "resolve" | "reject", note?: string): Promise<SLADispute> {
  const res = await api.patch<SLADispute>(`/sla/disputes/${disputeId}`, { action, resolution_note: note });
  return res.data;
}
