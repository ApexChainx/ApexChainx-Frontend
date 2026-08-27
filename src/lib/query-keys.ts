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
 *
 * ── Registering new query-key factories (issue #382) ─────────────────────
 *
 * The static registry guard (`tests/query-key-registry.test.ts`) scans `src/`
 * and asserts that every root passed to `invalidateQueries` / `setQueryData`
 * is ALSO published by at least one `useQuery({ queryKey })` call (a root
 * "publishes" a family when it is used as the key of a query). This prevents
 * a mutation from invalidating a family nothing subscribes to — which would
 * silently no-op and leave stale data on screen.
 *
 * To add a new query-key family:
 *   1. Add (or extend) a factory here and export it, e.g.
 *        export const myFeatureKeys = {
 *          all: ["my-feature"] as const,
 *          list: (params) => ["my-feature", "list", params] as const,
 *        };
 *   2. Publish the family with at least one query:
 *        useQuery({ queryKey: myFeatureKeys.list(params), queryFn: fetchList })
 *   3. Invalidate it from mutations using the same factory root:
 *        queryClient.invalidateQueries({ queryKey: myFeatureKeys.all })
 *   4. If the new factory lives outside `src/lib/query-keys.ts`, register it
 *      in the guard's `FACTORIES` map (tests/query-key-registry.test.ts) so
 *      the scanner can resolve it; inline array literals need no registration.
 *   5. Run `npm test` — the guard fails if any invalidated root has no
 *      publisher.
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
