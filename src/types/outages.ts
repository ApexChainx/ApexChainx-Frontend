export type Severity = "critical" | "high" | "medium" | "low";
export type OutageStatus = "active" | "investigating" | "resolved";

export interface Location {
  latitude: number;
  longitude: number;
}

export interface SLAStatus {
  status: "met" | "violated" | "in_progress";
  mttr_minutes?: number;
  threshold_minutes: number;
  time_remaining_minutes?: number;
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
  sla_status?: SLAStatus;
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
