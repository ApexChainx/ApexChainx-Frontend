# ApexChain Offline-First Cache Architecture

This document describes how ApexChain's frontend keeps data available when the
network is unavailable or the backend is unreachable. The offline-first story
spans four layers, each with its own store, expiry model, and purge semantics:

| Layer | Storage | What is cached | Expiry |
|:---|:---|:---|:---|
| `persistedCache` (`src/lib/persisted-cache.ts`) | IndexedDB (`apexchain-cache` / `query-cache`) | Outage list snapshots keyed by query params | Per-entry `expiresAt` (default 30 min TTL) |
| React Query cache (`src/providers/react-query.tsx`) | In-memory | Any `useQuery` result (outages, payments, SLA events, config) | `staleTime` / `gcTime` per query |
| Service worker (`public/sw.js`) | Cache Storage (`apexchain-static-v1`) | Static app shell + GET responses (non-API) | Cache versioning via `CACHE_NAME` |
| Tokens & session flags | `localStorage` / cookies | Access/refresh tokens, `noc_session_seen` flag | API-driven / heartbeat |

---

## What is cached where

### 1. `persistedCache` — IndexedDB layer

The `persistedCache` module (introduced for issue #130) is a thin promise wrapper
over IndexedDB. It stores arbitrary JSON values under a string key.

- **Database**: `apexchain-cache`, version `1`
- **Object store**: `query-cache`, keyed by the entry's `key` field
- **Entry shape**: `{ key, data, expiresAt, updatedAt }`
- **Default TTL**: `1000 * 60 * 30` (30 minutes) passed to `set()`

The write path is **upsert** (`store.put`), so re-writing the same key replaces
the previous entry. `get()` returns `null` for a missing key, an expired entry
(and removes the expired entry in the background), or when IndexedDB is
unavailable. All operations catch their own errors and log a warning rather than
throwing, so the cache is always best-effort.

### 2. React Query cache

The `ReactQueryProvider` creates a single `QueryClient` held in component state.
Queries use the central `slaEventKeys` factory (`src/lib/query-keys.ts`) so that
mutating flows can invalidate the whole `["sla-events"]` family at once.

For the outages list specifically (`src/features/outages/hooks/useOutages.ts`):

- **`staleTime`**: 5 minutes
- **`gcTime`**: 10 minutes
- **`retry`**: 2
- **`refetchOnWindowFocus`**: `false` (avoids surprise network churn)
- **`placeholderData`**: `keepPreviousData` (keeps the last page visible while paging)

### 3. Service worker

`src/lib/register-sw.ts` registers `public/sw.js` on `window.load` and is
imported from `src/app/layout.tsx`.

- **Cache name**: `apexchain-static-v1`
- **Pre-cached shell**: `/`, `/login`, `/outages`, `/payments`, `/bulk-import`, `/webhooks`
- **Fetch strategy**: **stale-while-revalidate** — serve the cached response
  immediately, fetch in the background, and update the cache when the fetch
  succeeds. On fetch failure, fall back to the cached copy.
- **API exclusion**: any request whose URL contains `/api/` is passed straight
  through to the network and never cached. The SW only handles `GET` requests.
- **Versioning**: on `activate`, all cache keys other than the current
  `CACHE_NAME` are deleted, so bumping `CACHE_NAME` is the supported way to
  invalidate the app shell.

---

## TTL / staleTime / gcTime summary

| Setting | Value | Applies to |
|:---|:---|:---|
| `persistedCache` default TTL | 30 min | IndexedDB outages snapshots |
| `staleTime` | 5 min | React Query outages query |
| `gcTime` | 10 min | React Query outages query |
| SW pre-cache | until next `CACHE_NAME` bump | app shell / static assets |

---

## Hydration rules

The outages hook hydrates from IndexedDB on first mount to give the operator a
last-known-good list before any network round-trip.

- **Non-empty guard**: a cached snapshot is only used if `cached.items.length > 0`.
  Empty snapshots are discarded (an empty list is not treated as meaningful
  offline data).
- **Once-per-mount**: `hydratedRef` ensures hydration runs exactly once per
  component mount, not on every re-render or param change.
- **Non-destructive**: hydration only calls `queryClient.setQueryData` when
  there is **no existing data** (`!existing || existing.items.length === 0`).
  Fresh network data already in the cache is never clobbered.
- **Silent fallback**: if IndexedDB is unavailable or the read rejects, the
  hook silently falls back to the network fetch.

On every **successful** network fetch with non-empty results, the hook writes
the fresh snapshot back to `persistedCache` under a key derived from the
normalized query params (`outages:{JSON params}`), refreshing the 30-minute TTL.

---

## Purge points

### Logout

`clearSession()` in `src/providers/session.tsx` clears tokens and the session
flag:

- `clearTokens()` — removes access/refresh tokens
- `clearSessionFlag()` — removes the `noc_session_seen` localStorage flag
- broadcasts a `logout` message across tabs

**Known gap**: logout does **not** clear the IndexedDB outage cache or the React
Query cache. This is intentional today (cached outage data is non-sensitive
operational data), but a per-user boundary / logout-purge is listed as a known
gap below.

### Login / session revocation

A revoked session (via SSE `session_revoked` event, heartbeat 401, or a
definitive bootstrap `401/403`) calls `clearSession()` — same behavior as
logout. Tokens are cleared but cached operational data is retained.

### Schema bump

There is **no schema-migration / version-bump purge today**. `DB_VERSION` is
fixed at `1` and the object store is only created on first open. A future bump
would use IndexedDB's `onupgradeneeded` to drop or reshape the store.

### Service worker cache clear

The SW clears all cache entries whose key differs from the current `CACHE_NAME`
during `activate`. Bumping `CACHE_NAME` (e.g. to `apexchain-static-v2`) is the
supported purge mechanism for the app shell.

---

## Per-user boundary decision

Offline outage data is currently cached **globally, not per-user**. The cache
key is derived only from query params (`outages:{params}`), so snapshots are
shared across authenticated sessions on the same browser.

This is acceptable because the cached data is non-sensitive operational status
data. However, any future per-user data cached through this layer (payments,
SLA configuration, disputes) **must** include a user/session discriminator in
the cache key and be purged on logout.

---

## Known gaps

- **No logout purge of IndexedDB / React Query cache** — cross-user leakage is
  currently prevented only by the fact that cached data is non-sensitive. If
  per-user data is ever cached, this becomes a real risk.
- **No schema versioning** — `DB_VERSION` is hard-coded to `1`; there is no
  mechanism to migrate or invalidate entries when the cache entry shape changes.
- **No explicit cross-user boundary in keys** — keys are query-param-only and
  do not carry a user id.
- **No cache-cap / eviction policy** beyond per-entry TTL — unbounded growth is
  possible over a long-lived browser profile, since entries are only removed
  when read-after-expiry or explicitly deleted.

---

## Related files

- `src/lib/persisted-cache.ts` — IndexedDB persistence layer
- `src/lib/query-keys.ts` — central query-key factory
- `src/features/outages/hooks/useOutages.ts` — hydration + write-back logic
- `src/providers/react-query.tsx` — `QueryClient` setup
- `src/lib/register-sw.ts` / `public/sw.js` — service worker
- `src/providers/session.tsx` — logout / session-revocation purge points

