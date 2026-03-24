import { api } from "@/lib/api";
import { PaginatedPayments } from "../types/payment";

export const fetchPayments = async (
  page: number = 1,
  perPage: number = 10
): Promise<PaginatedPayments> => {
  const response = await api.get<PaginatedPayments>("/payments", {
    params: { page, per_page: perPage },
  });
  return response.data;
};
