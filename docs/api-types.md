# API Type Synchronization Strategy

## Problem

Frontend types in `src/types/` and backend response shapes in `noc-iq-be` evolve independently. Without a sync strategy, type drift causes silent runtime failures in service modules and view components.

## Strategy

### Source of truth

The backend (`noc-iq-be`) owns the canonical API contract. The frontend mirrors it in `src/types/`.

### Sync approach (manual + review-gated)

Until the backend exposes an OpenAPI spec, the process is:

1. **On every backend change** that touches a response shape, the backend PR must update `src/types/` in this repo (or open a linked FE issue).
2. **High-risk models** (listed below) are reviewed on every PR that touches `src/services/` or `src/types/`.
3. **Type assertions are banned** — no `as SomeType` casts on raw API responses. Use typed generics (`api.get<T>`) so TypeScript catches shape mismatches at compile time.

### High-risk shared models

| Type | File | Backend endpoint |
|------|------|-----------------|
| `Payment` | `src/types/payment.ts` | `GET /payments/:id` |
| `Outage` | `src/types/outages.ts` | `GET /outages/:id` |
| `SLAResult` | `src/types/outages.ts` | embedded in outage resolve response |
| `OutageResolutionPayment` | `src/types/outages.ts` | `POST /outages/:id/resolve` |

### Future: OpenAPI codegen

When `noc-iq-be` publishes an OpenAPI spec (`/openapi.json`), replace manual types with generated ones:

```bash
npx openapi-typescript http://localhost:8000/openapi.json -o src/types/api.generated.ts
```

Then re-export the relevant types from `src/types/` wrappers so call sites don't change.

### Checklist for service changes

- [ ] Does the response shape match the current backend?
- [ ] Are optional fields (`?`) correctly marked?
- [ ] Are new fields added to the type before using them in components?
- [ ] Does `npm run build` pass with no type errors?
