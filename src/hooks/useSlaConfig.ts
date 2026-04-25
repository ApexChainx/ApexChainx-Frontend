"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

type Severity = "critical" | "high" | "medium" | "low";

type SLASeverityConfig = {
  threshold_minutes: number;
  penalty_per_minute: number;
  reward_base: number;
};

type SLAConfigMap = Record<string, SLASeverityConfig>;

export type EditableConfig = SLASeverityConfig & { severity: Severity };

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const SLA_CONFIG_KEY = ["sla", "config"] as const;

export function useSlaConfig() {
  return useQuery({
    queryKey: SLA_CONFIG_KEY,
    queryFn: async () => {
      const { data } = await api.get<SLAConfigMap>("/sla/config");
      return Object.entries(data)
        .map(([severity, config]) => ({ severity: severity as Severity, ...config }))
        .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
    },
  });
}

export function useUpdateSlaConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ severity, ...body }: EditableConfig) => {
      const { data } = await api.put<SLASeverityConfig>(`/sla/config/${severity}`, body);
      return { severity, ...data } as EditableConfig;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<EditableConfig[]>(SLA_CONFIG_KEY, (prev) =>
        prev?.map((c) => (c.severity === updated.severity ? updated : c)) ?? [],
      );
    },
  });
}
