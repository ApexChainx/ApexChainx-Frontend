import axios from "axios";
import { PaginatedPayments } from "../types/payment";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export const fetchPayments = async (
  page: number = 1,
  perPage: number = 10
): Promise<PaginatedPayments> => {
  const response = await axios.get<PaginatedPayments>(`${API_BASE}/payments`, {
    params: { page, per_page: perPage },
  });
  return response.data;
};
