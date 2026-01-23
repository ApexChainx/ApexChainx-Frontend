import { api } from "@/lib/api";
import type { SLAResult } from "@/types/sla";

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
  const res = await api.get<SLAResult>("/sla/preview", {
    params,
  });
  return res.data;
}
