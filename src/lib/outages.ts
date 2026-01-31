import axios from "axios";

export interface Outage {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  status: "open" | "resolved";
  started_at: string;
  resolved_at?: string;
  mttr_minutes?: number;
  sla_result?: {
    status: "met" | "violated";
    amount: number;
    rating: string;
  };
}

export interface OutagesResponse {
  data: Outage[];
  page: number;
  page_size: number;
  total: number;
}

export interface OutagesQuery {
  page: number;
  page_size: number;
  severity?: string;
  status?: string;
  search?: string;
  sort?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;

export async function fetchOutages(query: OutagesQuery) {
  const params = new URLSearchParams({
    page: query.page.toString(),
  });

  if (query.severity) {
    params.set("severity", query.severity);
  }

  const res = await fetch(`${API_BASE_URL}/api/v1/outages/?page=1`);

  if (!res.ok) {
    throw new Error("Failed to fetch outages");
  }

  return res.json();
}
