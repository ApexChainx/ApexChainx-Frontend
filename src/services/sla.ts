import { api } from "@/lib/api";
import type {
  DisputeListParams,
  FlagDisputePayload,
  PaginatedDisputes,
  ResolveDisputePayload,
  SLADispute,
  SLAResult,
} from "@/types/sla";

export async function calculateSLA(params: {
  outage_id: string;
  severity: string;
  mttr_minutes: number;
}): Promise<SLAResult> {
  const res = await api.get<SLAResult>("/sla/calculate", { params });
  return res.data;
}

export async function previewSLA(params: {
  severity: string;
  mttr_minutes: number;
}): Promise<SLAResult> {
  const res = await api.post<SLAResult>("/sla/preview", params);
  return res.data;
}

export async function getDisputes(params: DisputeListParams): Promise<PaginatedDisputes> {
  const res = await api.get<PaginatedDisputes>("/sla/disputes", { params });
  return res.data;
}

export async function flagDispute(payload: FlagDisputePayload): Promise<SLADispute> {
  const res = await api.post<SLADispute>("/sla/disputes", payload);
  return res.data;
}

export async function resolveDispute(
  disputeId: string,
  payload: ResolveDisputePayload,
): Promise<SLADispute> {
  const res = await api.patch<SLADispute>(`/sla/disputes/${disputeId}`, payload);
  return res.data;
}
