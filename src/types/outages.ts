export type Severity = "critical" | "high" | "medium" | "low";
export type OutageStatus = "active" | "investigating" | "resolved";

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

export interface Outage {
  id: string;
  site_name: string;
  site_id?: string;
  severity: Severity;
  status: OutageStatus;
  detected_at: string; // ISO string
  resolved_at?: string;
  description: string;
  affected_services: string[];
  affected_subscribers?: number;
  assigned_to?: string;
  created_by?: string;
  location?: Location;
  sla_status?: SLAResult;
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
  mttr: number; // Sending MTTR ensures the preview matches the final resolution
}

export interface SlaPreviewResponse {
  reward: number;
  penalty: number;
  rating: string | number; 
}
