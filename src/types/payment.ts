export type PaymentType = "reward" | "penalty";
export type PaymentStatus = string;

export interface Payment {
  id: string;
  outage_id: string;
  type: PaymentType;
  amount: number;
  asset_code: string;
  transaction_hash: string;
  from_address: string;
  to_address: string;
  status: PaymentStatus;
  created_at: string;
  confirmed_at?: string | null;
  sla_result_id?: number | null;
}

export interface PaginatedPayments {
  items: Payment[];
  total: number;
  page: number;
  page_size: number;
}
