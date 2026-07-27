/** ApexChain Network Operations Intelligence Platform */
/**
 * Centralised query-key factory — SLA_EVENTS family
 *
 * Issue #131 — Coordinate query invalidation across mutating flows.
 *
 * Every mutation that changes an outage (resolve, update, delete, bulk ops)
 * should invalidate the entire SLA_EVENTS key family so that dashboards,
 * payment lists, and dispute panels always reflect the latest state.
 *
 * Usage:
 *   import { slaEventKeys } from "@/lib/query-keys";
 *   queryClient.invalidateQueries({ queryKey: slaEventKeys.all });
 */

export const slaEventKeys = {
  /** The root key — invalidating this busts every cache below */
  all: ["sla-events"] as const,

  /** Dashboard analytics */
  dashboard: (filters?: Record<string, unknown>) =>
    ["sla-events", "dashboard", filters] as const,

  /** SLA calculations & previews */
  sla: {
    all: ["sla-events", "sla"] as const,
    calculate: (params?: Record<string, unknown>) =>
      ["sla-events", "sla", "calculate", params] as const,
    preview: (params?: Record<string, unknown>) =>
      ["sla-events", "sla", "preview", params] as const,
  },

  /** Outages list & detail */
  outages: {
    all: ["sla-events", "outages"] as const,
    list: (params?: Record<string, unknown>) =>
      ["sla-events", "outages", "list", params] as const,
    detail: (id: string) => ["sla-events", "outages", id] as const,
  },

  /** Payments */
  payments: {
    all: ["sla-events", "payments"] as const,
    list: (filters?: Record<string, unknown>) =>
      ["sla-events", "payments", "list", filters] as const,
    detail: (id: string) => ["sla-events", "payments", id] as const,
  },

  /** SLA disputes */
  disputes: {
    all: ["sla-events", "disputes"] as const,
    list: (params?: Record<string, unknown>) =>
      ["sla-events", "disputes", "list", params] as const,
    detail: (id: string) => ["sla-events", "disputes", id] as const,
  },

  /** SLA configuration */
  config: ["sla-events", "config"] as const,
};
