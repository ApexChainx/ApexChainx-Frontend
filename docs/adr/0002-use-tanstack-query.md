# 0002: Use TanStack Query as Server State Cache

- **Status:** accepted
- **Date:** 2026-07-24
- **Deciders:** ApexChain team

## Context

The frontend needs to fetch, cache, and synchronize server state across components. Multiple options exist for managing server state in React applications.

## Decision

Use TanStack Query (React Query v5) as the server state cache layer.

## Considered Options

1. TanStack Query (chosen)
2. SWR
3. Redux Toolkit Query (RTK Query)
4. Custom fetch + context

## Decision Outcome

Chosen option: TanStack Query, because it provides the most mature query caching, background refetching, and devtools. It integrates well with Next.js App Router and has excellent TypeScript support.

### Positive Consequences

- Automatic cache invalidation and background refetching
- Built-in devtools for debugging
- Strong TypeScript inference
- Large ecosystem and community

### Negative Consequences

- Additional bundle size (~13KB gzipped)
- Learning curve for query/mutation patterns

## Links

- [TanStack Query docs](https://tanstack.com/query)
