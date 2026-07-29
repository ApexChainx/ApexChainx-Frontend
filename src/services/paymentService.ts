/** ApexChain Network Operations Intelligence Platform */
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import { PaginatedPayments, Payment } from "../types/payment";

export interface PaymentFilters {
  page?: number | undefined;
  page_size?: number | undefined;
  status?: string | undefined;
  type?: string | undefined;
  date_from?: string | undefined;
  date_to?: string | undefined;
}

export const fetchPayments = async (
  filters: PaymentFilters = {}
): Promise<PaginatedPayments> => {
  const { page = 1, page_size = 10, ...rest } = filters;
  const response = await api.get<PaginatedPayments>(ENDPOINTS.payments.base, {
    params: { page, page_size, ...rest },
  });
  return response.data;
};

export const fetchPayment = async (id: string, signal?: AbortSignal): Promise<Payment> => {
  const requestConfig = signal ? { signal } : {};
  const response = await api.get<Payment>(ENDPOINTS.payments.byId(id), requestConfig);
  return response.data;
};

export const retryPayment = async (id: string): Promise<Payment> => {
  const response = await api.post<Payment>(ENDPOINTS.payments.retry(id));
  return response.data;
};

export const reconcilePayment = async (id: string): Promise<Payment> => {
  const response = await api.post<Payment>(ENDPOINTS.payments.reconcile(id));
  return response.data;
};

export const exportPayments = async (filters: Omit<PaymentFilters, "page" | "page_size"> = {}): Promise<void> => {
  const response = await api.get(ENDPOINTS.payments.export, {
    params: filters,
    responseType: "blob",
  });
  const url = URL.createObjectURL(response.data as Blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
