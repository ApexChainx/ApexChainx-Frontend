# 0005: Use Tailwind CSS 4 + Radix UI Primitives

- **Status:** accepted
- **Date:** 2026-07-24
- **Deciders:** ApexChain team

## Context

The frontend needs a styling system and accessible component primitives. The choice affects developer experience, bundle size, and accessibility compliance.

## Decision

Use Tailwind CSS 4 for utility-first styling and Radix UI for accessible component primitives.

## Considered Options

1. Tailwind CSS 4 + Radix UI (chosen)
2. Tailwind CSS 4 + shadcn/ui
3. CSS Modules + custom components
4. Styled Components + Material UI

## Decision Outcome

Chosen option: Tailwind CSS 4 + Radix UI, because it provides the best balance of developer velocity, accessibility, and customizability. Radix primitives handle ARIA attributes, focus management, and keyboard navigation out of the box.

### Positive Consequences

- Excellent accessibility by default
- Utility-first CSS with zero runtime
- Composable primitive components
- Strong TypeScript support

### Negative Consequences

- Tailwind CSS 4 API changes from v3
- Radix primitives require composition patterns

## Links

- [Tailwind CSS](https://tailwindcss.com)
- [Radix UI](https://www.radix-ui.com)
