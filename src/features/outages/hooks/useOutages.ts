import { fetchOutages } from "@/lib/outages";
import { useQuery } from "@tanstack/react-query";

export function useOutages(query: { page: number; severity?: string }) {
  return useQuery({
    queryKey: ["outages", query],
    queryFn: () => fetchOutages(query),
  });
}
