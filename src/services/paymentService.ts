import { api } from "@/lib/api";
import { PaginatedPayments, Payment } from "../types/payment";

export interface PaymentFilters {
  page?: number;
  page_size?: number;
  status?: string;
  type?: string;
  date_from?: string;
  date_to?: string;
}

export const fetchPayments = async (
  filters: PaymentFilters = {}
): Promise<PaginatedPayments> => {
  const { page = 1, page_size = 10, ...rest } = filters;
  const response = await api.get<PaginatedPayments>("/payments", {
    params: { page, page_size, ...rest },
  });
  return response.data;
};

export const fetchPayment = async (id: string): Promise<Payment> => {
  const response = await api.get<Payment>(`/payments/${id}`);
  return response.data;
};

export const retryPayment = async (id: string): Promise<Payment> => {
  const response = await api.post<Payment>(`/payments/${id}/retry`);
  return response.data;
};

export const reconcilePayment = async (id: string): Promise<Payment> => {
  const response = await api.post<Payment>(`/payments/${id}/reconcile`);
  return response.data;
};
