import { api } from "@/lib/api";
import { PaginatedPayments, Payment } from "../types/payment";

export const fetchPayments = async (
  page: number = 1,
  perPage: number = 10
): Promise<PaginatedPayments> => {
  const response = await api.get<PaginatedPayments>("/payments", {
    params: { page, page_size: perPage },
  });
  return response.data;
};

export const fetchPayment = async (id: string): Promise<Payment> => {
  const response = await api.get<Payment>(`/payments/${id}`);
  return response.data;
};
