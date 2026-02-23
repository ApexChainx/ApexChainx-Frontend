export type PaymentType = "reward" | "penalty";
export type PaymentStatus = "pending" | "paid" | "disputed" | "cancelled";

export interface Payment {
  id: string;
  outage_id: string;
  type: PaymentType;
  amount: number;
  date: string;
  status: PaymentStatus;
}

export interface PaginatedPayments {
  data: Payment[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}
