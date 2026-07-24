# 0004: Use App Router with Grouped Routes

- **Status:** accepted
- **Date:** 2026-07-24
- **Deciders:** ApexChain team

## Context

Next.js supports both Pages Router and App Router. The routing architecture affects layout nesting, data fetching patterns, and code organization.

## Decision

Use Next.js App Router with route groups for logical organization.

## Considered Options

1. App Router with route groups (chosen)
2. Pages Router
3. App Router without route groups

## Decision Outcome

Chosen option: App Router with route groups, because it enables parallel layouts, streaming SSR, and colocation of route-specific components. Route groups like `(auth)` allow shared auth layouts without affecting URLs.

### Positive Consequences

- Parallel route layouts
- Server Components by default
- Colocation of route-specific code
- Built-in loading and error states

### Negative Consequences

- App Router is still evolving
- Some patterns less documented than Pages Router

## Links

- [Next.js App Router docs](https://nextjs.org/docs/app)
