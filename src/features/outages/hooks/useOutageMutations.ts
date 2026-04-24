import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { deleteOutage, getOutage, resolveOutage } from "@/services/outages";

export const outageKeys = {
  all: ["outages"] as const,
  detail: (id: string) => ["outages", id] as const,
};

export function useOutage(id: string) {
  return useQuery({
    queryKey: outageKeys.detail(id),
    queryFn: () => getOutage(id),
    enabled: !!id,
    refetchInterval: (query) =>
      query.state.data?.status === "resolved" ? false : 15_000,
  });
}

export function useResolveOutage(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mttrMinutes: number) =>
      resolveOutage(id, { mttr_minutes: mttrMinutes }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: outageKeys.detail(id) });
      void qc.invalidateQueries({ queryKey: outageKeys.all });
    },
  });
}

export function useDeleteOutage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteOutage(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: outageKeys.all });
    },
  });
}
