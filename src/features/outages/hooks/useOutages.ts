import { fetchOutages } from "@/lib/outages";
import { useQuery } from "@tanstack/react-query";

export function useOutages(query: {
  page: number;
  page_size?: number;
  severity?: string;
  status?: string;
  search?: string;
  sort?: string;
}) {
  return useQuery({
    queryKey: ["outages", query],
    queryFn: () => fetchOutages(query),
  });
}
