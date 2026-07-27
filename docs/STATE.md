# State Management with React Query

This document outlines the standard patterns for server state management in ApexChain using TanStack React Query. All developers working with data fetching, caching, and mutations must follow these patterns to ensure consistency across the codebase.

## Table of Contents
- [Query Key Factory Pattern](#query-key-factory-pattern)
- [placeholderData: keepPreviousData Rule](#placeholderdata-keeppreviousdata-rule)
- [Mutation Invalidation Strategy](#mutation-invalidation-strategy)
- [Polling vs Realtime Tradeoff](#polling-vs-realtime-tradeoff)

---

## Query Key Factory Pattern

All React Query keys must follow a structured, type-safe factory pattern to avoid duplication and ensure consistent cache management. This pattern is already implemented for outages in `src/features/outages/hooks/useOutageMutations.ts`.

### Standard Structure

Create a key factory object for each domain with standardized methods:

```typescript
// Correct pattern for all query key factories
export const domainKeys = {
  // Base key for all entries in this domain
  all: ["domain"] as const,
  // List/filtered queries with parameters
  lists: (params: Record<string, unknown>) => ["domain", "list", params] as const,
  // Individual detail queries by ID
  detail: (id: string) => ["domain", id] as const,
};
```

### Example Implementation (Outages)
```typescript
// src/features/outages/hooks/useOutageMutations.ts
export const outageKeys = {
  all: ["outages"] as const,
  detail: (id: string) => ["outages", id] as const,
};
```

### Usage in useQuery
```typescript
// In a component or hook
export function useOutage(id: string) {
  return useQuery({
    queryKey: outageKeys.detail(id),  // Use the factory
    queryFn: () => getOutage(id),
    enabled: !!id,
  });
}
```

### Why This Pattern?
- **Type Safety**: `as const` ensures TypeScript infers literal types, preventing invalid key usage
- **Consistency**: All domains follow the same structure, making cache invalidation predictable
- **Refactorability**: Changing the key structure only needs to happen in one place
- **Debuggability**: Consistent keys make it easy to inspect the React Query cache in devtools

### Scaling to Complex Query Types
For domains with multiple query types (lists, statistics, aggregations), extend the factory:

```typescript
export const dashboardKeys = {
  all: ["dashboard"] as const,
  metrics: (filters: FilterParams) => ["dashboard", "metrics", filters] as const,
  trends: (timeRange: TimeRange) => ["dashboard", "trends", timeRange] as const,
  slaSummary: () => ["dashboard", "sla-summary"] as const,
};
```

---

## placeholderData: keepPreviousData Rule

**MANDATORY**: All paginated, filtered, or searchable queries must use `placeholderData: keepPreviousData` to provide a smooth user experience during pagination and filtering operations.

### What is keepPreviousData?
`keepPreviousData` from `@tanstack/react-query` retains the previous query's data while new data is being fetched, preventing UI flicker and maintaining context for the user.

### Required Implementation
```typescript
import { keepPreviousData, useQuery } from "@tanstack/react-query";

export function usePaginatedData(params: PaginationParams) {
  return useQuery({
    queryKey: domainKeys.lists(params),
    queryFn: () => fetchData(params),
    placeholderData: keepPreviousData,  // ALWAYS include this for paginated data
    staleTime: 1000 * 60 * 5,  // 5 minutes
  });
}
```

### Current Implementation Reference
```typescript
// src/features/outages/hooks/useOutages.ts
return useQuery<PaginatedOutages, Error>({
  queryKey: ["outages", normalizedParams],
  queryFn: ({ signal }) => fetchOutages(normalizedParams, { signal }),
  placeholderData: keepPreviousData,  // Already implemented correctly
  staleTime: 1000 * 60 * 5, // 5 minutes
  gcTime: 1000 * 60 * 10, // 10 minutes
});
```

### When to Use keepPreviousData
✅ **Always use** for:
- Paginated lists (page/page_size parameters)
- Filtered datasets (severity, status, search parameters)
- Sorted data that refetches on sort change
- Any query where parameters change and the UI would otherwise flash to a loading state

❌ **Never use** for:
- Static detail queries that only fetch once
- Mutations (this is for queries only)
- Single-use background refreshes

### Benefits
- **Eliminates loading spinners** during pagination for a faster perceived experience
- **Maintains UI stability** when applying filters
- **Preserves scroll position** while new data loads
- **Graceful degradation** - users see stale data while waiting for fresh data

---

## Mutation Invalidation Strategy

After any mutation that modifies server state, you must invalidate the appropriate React Query cache entries to ensure all components receive fresh data.

### Invalidation Hierarchy
Invalidate from the most specific to the most general to refresh only what's needed:

1. **Detail query** - Invalidate the specific item that was modified
2. **List/all queries** - Invalidate any lists that might contain the modified item
3. **Related domains** - Only if the mutation affects other domains

### Standard Pattern
```typescript
export function useUpdateItem(id: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (updateData) => updateItem(id, updateData),
    onSuccess: () => {
      // 1. Invalidate the specific detail view
      queryClient.invalidateQueries({ queryKey: domainKeys.detail(id) });
      // 2. Invalidate all list views
      queryClient.invalidateQueries({ queryKey: domainKeys.all });
    },
  });
}
```

### Current Implementation Reference
```typescript
// src/features/outages/hooks/useOutageMutations.ts
export function useResolveOutage(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mttrMinutes: number) => resolveOutage(id, { mttr_minutes: mttrMinutes }),
    onSuccess: () => {
      // Invalidate the specific outage that was resolved
      void qc.invalidateQueries({ queryKey: outageKeys.detail(id) });
      // Invalidate the outage list to reflect the new status
      void qc.invalidateQueries({ queryKey: outageKeys.all });
    },
  });
}
```

### Common Mutation Scenarios

#### Create Operation
```typescript
// When creating a new item, only need to invalidate the list
onSuccess: () => {
  qc.invalidateQueries({ queryKey: domainKeys.all });
};
```

#### Update Operation
```typescript
// When updating an existing item, invalidate both detail and list
onSuccess: () => {
  qc.invalidateQueries({ queryKey: domainKeys.detail(id) });
  qc.invalidateQueries({ queryKey: domainKeys.all });
};
```

#### Delete Operation
```typescript
// When deleting, invalidate the list (detail will 404 anyway)
onSuccess: () => {
  qc.invalidateQueries({ queryKey: domainKeys.all });
};
```

### What to Avoid
- ❌ Don't invalidate `['']` or use broad matches unless absolutely necessary
- ❌ Don't forget to invalidate related queries in other domains if they display derived data
- ❌ Don't invalidate unnecessarily - only invalidate what the mutation affects

---

## Polling vs Realtime Tradeoff

ApexChain uses polling for real-time updates rather than WebSockets or Server-Sent Events. This decision balances simplicity, cost, and user experience needs.

### Current Polling Strategy

#### Active Outages: Poll every 30 seconds
```typescript
// src/features/outages/hooks/useOutageMutations.ts
refetchInterval: (query) => 
  query.state.data?.status === "resolved" ? false : 30_000,
```

Active (unresolved) outages poll for updates every 30 seconds to reflect:
- Status changes
- Assignment changes
- SLA timer updates
- Operator comments

#### Resolved Outages: No polling
Once an outage is marked as resolved, polling stops since the data is static and won't change significantly.

#### Dashboard Metrics: Window focus refetch
```typescript
refetchOnWindowFocus: true
```
Dashboard metrics refresh when the user returns to the browser window, reducing unnecessary background traffic.

### When to Use Polling

Choose polling for:
- **Critical active data** that users are actively monitoring (outages, incidents)
- **Data that changes infrequently** (every 30+ seconds)
- **Low-traffic applications** where WebSocket overhead isn't justified
- **Simple deployments** where maintaining a WebSocket server adds complexity

### When to Consider Realtime (WebSockets)

Re-evaluate and implement WebSockets when:
- Polling latency negatively impacts user experience (< 30s updates needed)
- The user base grows to the point where server load from polling becomes significant
- There are multiple simultaneous users collaborating on the same data
- Real-time collaboration features are required

### Configuration Guidelines per Feature

| Feature | Polling Strategy | Rationale |
|---------|-----------------|-----------|
| Active outage detail | 30s interval | Users monitor critical outages closely |
| Outage list | refetchOnWindowFocus | Users browsing the list don't need constant updates |
| Dashboard analytics | refetchOnWindowFocus + 5min staleTime | Metrics don't change second-to-second |
| Payment history | Manual refresh + window focus | Financial data rarely changes while browsing |
| Webhook delivery logs | 60s interval | Need to track delivery status in near-realtime |

### Environment-Based Tuning
Adjust polling intervals based on environment:
- **Development**: Faster polling (15s) to test real-time features
- **Staging**: Same as production (30s)
- **Production**: 30s for active items, window focus otherwise

### Future Considerations
As the application scales, evaluate:
- **WebSocket implementation** for active outage collaboration
- **Incremental stale-while-revalidate** instead of full invalidation
- **Background sync** for mobile users with limited connectivity
- **Push notifications** for critical severity outages

---

## Related Documentation
- [React Query Official Documentation](https://tanstack.com/query/latest)
- [API Documentation](./API.md) - Backend API endpoints and schemas
- [Type Synchronization](./api-types.md) - How API types are kept in sync