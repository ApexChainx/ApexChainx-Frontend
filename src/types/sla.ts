export interface SLAResult {
  outage_id: string;
  status: "met" | "violated";
  mttr_minutes: number;
  threshold_minutes: number;
  amount: number; // negative = penalty, positive = reward
  payment_type: "reward" | "penalty";
  rating: "exceptional" | "excellent" | "good" | "poor";
}

export type DisputeStatus = "open" | "under_review" | "resolved" | "rejected";

export interface SLADispute {
  id: string;
  outage_id: string;
  sla_result_id?: string;
  status: DisputeStatus;
  reason: string;
  created_at: string;
  resolved_at?: string | null;
  resolution_note?: string | null;
}

export interface FlagDisputePayload {
  outage_id: string;
  reason: string;
}

export interface ResolveDisputePayload {
  action: "resolve" | "reject";
  resolution_note?: string;
}

export interface DisputeListParams {
  outage_id: string;
  status?: DisputeStatus;
  page?: number;
  page_size?: number;
}

export interface PaginatedDisputes {
  items: SLADispute[];
  total: number;
  page: number;
  page_size: number;
}
