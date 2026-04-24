export type Severity = "critical" | "high" | "medium" | "low";
export type OutageStatus = "open" | "resolved";

export interface Location {
  latitude: number;
  longitude: number;
}

export interface SLAResult {
  status: "met" | "violated";
  mttr_minutes: number;
  threshold_minutes: number;
  amount: number;
  payment_type: "reward" | "penalty";
  rating: "exceptional" | "excellent" | "good" | "poor";
}

export interface OutageResolutionPayment {
  id: string;
  transaction_hash: string;
  type: string;
  amount: number;
  asset_code: string;
  from_address: string;
  to_address: string;
  status: string;
  outage_id: string;
  sla_result_id?: number | null;
  created_at: string;
  confirmed_at?: string | null;
}

export interface Outage {
  id: string;
  site_name: string;
  site_id?: string;
  severity: Severity;
  status: OutageStatus;
  detected_at: string;
  resolved_at?: string;
  description: string;
  affected_services: string[];
  affected_subscribers?: number;
  assigned_to?: string;
  created_by?: string;
  location?: Location;
  sla_status?: SLAResult;
  root_cause?: string;
  resolution_notes?: string;
}

export interface OutageCreate {
  id: string;
  site_name: string;
  site_id?: string;
  severity: Severity;
  status: OutageStatus;
  detected_at: string;
  description: string;
  affected_services: string[];
  affected_subscribers?: number;
  assigned_to?: string;
  created_by?: string;
  location?: Location;
}

export interface OutageUpdate {
  site_name?: string;
  severity?: Severity;
  status?: OutageStatus;
  resolved_at?: string;
  description?: string;
  affected_services?: string[];
  affected_subscribers?: number;
  assigned_to?: string;
}

export interface SlaPreviewPayload {
  outageId: string;
  mttr: number;
}

export interface SlaPreviewResponse {
  reward: number;
  penalty: number;
  rating: string | number;
}

export interface PaginatedOutages {
  items: Outage[];
  total: number;
  page: number;
  page_size: number;
}

export interface ResolveOutagePayload {
  mttr_minutes: number;
}

export interface ResolveOutageResponse {
  outage: Outage;
  sla: SLAResult;
  payment: OutageResolutionPayment;
}
