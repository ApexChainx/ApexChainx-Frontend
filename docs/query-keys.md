# Query Key Conventions

This document is the canonical reference for how React Query keys are named,
registered, and invalidated in the ApexChain platform. It exists so that the
"orphaned invalidation" class of defects — invalidating roots that nothing
publishes under — fails during review instead of silently no-op'ing at runtime.

## The single canonical factory

There is **one** canonical query-key factory: `slaEventKeys` in
`src/lib/query-keys.ts`. Every query that reads server state **must** derive its
`queryKey` from this factory (or from a domain-specific re-export of it, e.g.
`outageKeys = slaEventKeys.outages` in `src/features/outages/hooks/useOutageMutations.ts`).

Do **not** declare ad-hoc key arrays inline in a `useQuery`/`useMutation` call,
and do **not** create a second parallel factory.

## The key-family prefix convention

All keys share a single top-level prefix `["sla-events"]`, then branch by
domain. Invalidation uses TanStack React Query's **prefix matching**: calling
`invalidateQueries({ queryKey: X })` busts every cached entry whose key begins
with `X`. This is why nesting under one root lets a single `slaEventKeys.all`
invalidation refresh everything.

The canonical family (current shape of `slaEventKeys`):

```ts
slaEventKeys.all                  // ["sla-events"]
slaEventKeys.dashboard(filters)   // ["sla-events", "dashboard", filters]
slaEventKeys.sla.all              // ["sla-events", "sla"]
slaEventKeys.sla.calculate(p)     // ["sla-events", "sla", "calculate", p]
slaEventKeys.sla.preview(p)       // ["sla-events", "sla", "preview", p]
slaEventKeys.outages.all          // ["sla-events", "outages"]
slaEventKeys.outages.list(p)      // ["sla-events", "outages", "list", p]
slaEventKeys.outages.detail(id)   // ["sla-events", "outages", id]
slaEventKeys.payments.all         // ["sla-events", "payments"]
slaEventKeys.payments.list(f)     // ["sla-events", "payments", "list", f]
slaEventKeys.payments.detail(id)  // ["sla-events", "payments", id]
slaEventKeys.disputes.all         // ["sla-events", "disputes"]
slaEventKeys.disputes.list(p)     // ["sla-events", "disputes", "list", p]
slaEventKeys.disputes.detail(id)  // ["sla-events", "disputes", id]
slaEventKeys.config               // ["sla-events", "config"]
```

## How to add a key family

1. Add the new family to `slaEventKeys` in `src/lib/query-keys.ts`.
2. Give it an `all` root plus per-shape helpers (`list`, `detail`, etc.) so
   callers can invalidate at the granularity they need.
3. Every `useQuery` for that data uses the new family — never a literal array.
4. If a mutation changes that data, invalidate **through the family** (prefix
   match), never a raw root string.

Example — adding a `reports` family:

```ts
reports: {
  all: ["sla-events", "reports"] as const,
  list: (params?: Record<string, unknown>) =>
    ["sla-events", "reports", "list", params] as const,
  detail: (id: string) => ["sla-events", "reports", id] as const,
},
```

## How invalidation works

- Invalidate at the narrowest root that covers the changed data.
- To bust a whole domain use the family `.all` root, e.g.
  `invalidateQueries({ queryKey: slaEventKeys.outages.all })`.
- To bust a single cached shape use the specific helper, e.g.
  `invalidateQueries({ queryKey: slaEventKeys.outages.detail(id) })`.

## The registration rule (orphaned invalidation guard)

> **Every `invalidateQueries` / `setQueryData` root must be a key that some
> `useQuery` actually publishes under.**

A root that no query uses is an "orphaned invalidation" — it compiles and
typechecks (because `invalidateQueries` accepts any key shape) but silently
does nothing. That silent no-op is the root cause of several live defects.

How to verify a root is real:

1. Find every `queryKey:` passed to `useQuery` and collect the roots.
2. Find every root passed to `invalidateQueries` / `setQueryData`.
3. Each invalidation root must be a prefix of at least one published root
   (or equal to it).

The companion issue adds an automated test/lint rule that scans `src/` and
fails on any orphaned root. Until that lands, this check is done manually in
review.

## Known divergences (to be fixed by companion issues)

The codebase currently has several keys that violate the conventions above.
They are tracked here so new code does not copy them, and so the companion
fixes have a single reference:

| Key | Where | Problem |
| --- | --- | --- |
| `slaQueryKeys` (root `["sla"]`) | `src/services/sla.ts` | A **second** factory with a different root (`["sla"]` vs the canonical `["sla-events"]`). `slaEventKeys.sla.*` (`["sla-events","sla",...]`) and `slaQueryKeys.*` (`["sla",...]`) do **not** share a prefix, so invalidating one never touches the other. |
| `SLA_CONFIG_KEY = ["sla","config"]` | `src/hooks/useSlaConfig.ts` | Diverges from the canonical `slaEventKeys.config` (`["sla-events","config"]`). The config query can be invalidated under two different roots. |
| `["dashboard-metrics", filters]` | `src/components/dashboard/sla-dashboard-view.tsx` | Inline literal key outside any factory; not covered by `slaEventKeys.dashboard()`. |
| `["dashboard-metrics-compare", ...]` | `src/components/dashboard/sla-dashboard-view.tsx` | Inline literal key outside any factory. |
| `["sla-disputes", outageId, ...]` | `src/components/outages/SLADisputesPanel.tsx` | Inline literal key outside any factory; diverges from `slaEventKeys.disputes.*`. |
| `["session"]` | `src/hooks/useTwoFactor.ts` | Invalidated but **no query publishes under it** — an orphaned invalidation (no-op). |
| `slaEventKeys.dashboard()` vs `["dashboard-metrics"]` | `useInvalidateOnResolve.ts` vs `sla-dashboard-view.tsx` | `useInvalidateOnResolve` invalidates `slaEventKeys.dashboard()` (`["sla-events","dashboard"]`), but the dashboard publishes under `["dashboard-metrics"]` — a real mismatch, the invalidation misses the dashboard. |

None of these should be replicated in new code. Fix them by migrating each
literal/divergent key onto `slaEventKeys` (or a re-export) and removing the
parallel factory.
