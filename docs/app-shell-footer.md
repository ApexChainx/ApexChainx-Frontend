# App Shell Footer

> Issues #808–#811 — the site-wide footer had no responsive behaviour, no
> accessibility affordances, no reserved loading box, and no error containment.
> This document is the reference for the components that live in
> `src/components/layout/`.

## Components

| File | Purpose |
|------|---------|
| `src/components/layout/Footer.tsx` | The footer itself (Issues #808, #809) |
| `src/components/layout/footer-links.ts` | Link catalogue + admin filtering |
| `src/components/layout/FooterSkeleton.tsx` | Loading placeholder (Issue #810) |
| `src/components/layout/FooterErrorBoundary.tsx` | Failure containment (Issue #811) |

The footer is mounted once, in `src/app/layout.tsx`, directly after `<main>`
and inside `<FooterErrorBoundary>`.

## Responsive layout (Issue #808)

The footer had a fixed four-column flex row. At a 320px viewport the link
columns and the legal line pushed one another past the right edge, producing a
horizontal scroll for the whole page.

The current layout uses two responsive decisions:

1. **The outer row stacks.** `flex flex-col` promotes to `md:flex-row`, so the
   brand block sits above the link columns on phones and only becomes a
   side-by-side row from `md` up.
2. **The link columns are a grid, not a row.** `grid-cols-1` → `sm:grid-cols-2`
   → `lg:grid-cols-3`. A grid tracks collapse into implicit rows instead of
   overflowing, so the same markup is correct at every width.

Every text container that holds variable-length content carries `min-w-0` (so it
can shrink below its intrinsic width) and `break-words` (so a long unbroken
string wraps rather than forcing a scrollbar).

The footer is pinned to the bottom of short pages by `mt-auto`. That only works
because `<body>` in `src/app/layout.tsx` is `flex min-h-screen flex-col` and
`<main>` is `flex-1` — **if you change the shell layout, keep those three
classes or the footer will float directly under the content again.**

## Accessibility (Issue #809)

- The root `<footer>` is a `contentinfo` landmark with an `aria-label`, so it is
  reachable from the landmark list rather than by tabbing through the page.
- The link region is a `<nav>` with its own `aria-label`, keeping it
  distinguishable from the primary navigation bar.
- The network badge is `role="img"` with a text alternative
  (`footer.network:{network}`) rather than a bare coloured dot, so the network
  is announced instead of being skipped.
- External links carry `rel="noopener noreferrer"`, `target="_blank"`, a
  visually-hidden "opens in a new tab" note, and an `aria-hidden` arrow glyph —
  the label is announced, the arrow is not.
- Every link sets `focus-visible:outline-2` explicitly. The app-wide link
  styling suppresses the default outline, so the footer has to restore its own.

## Loading skeleton (Issue #810)

`FooterSkeleton` mirrors the footer's box (same outer classes, same
`max-w-7xl`, same `lg:grid-cols-3` grid) using the shared `Skeleton` primitive,
so the page does not shift when the real footer replaces it.

It is a `role="status"` region with `aria-live="polite"` and `aria-busy="true"`,
and the only text it exposes is the screen-reader-only `footer.loading` label —
the placeholder bars themselves are not announced.

## Error boundary (Issue #811)

`FooterErrorBoundary` is a class component that contains failures thrown while
rendering the footer. Without it, a throw from `useSession` or from the
translation lookup unwound the whole React tree and replaced the entire
application with the route-level error screen — an operator lost the dashboard
they were working in because a footer link failed to render.

On failure it renders an inline `role="alert"` fallback with the error message
and a **Retry** button that is focused on mount, so a keyboard user lands on the
recovery control instead of tabbing back through the shell. The rest of the
page stays mounted and interactive.

Follow the same pattern (`MetricErrorBoundary` for dashboard tiles) for any
new shell-level region that composes session or translation state.

## Adding a footer link

Links are plain data in `src/components/layout/footer-links.ts`. Add a
`FooterLink` to the relevant group:

```typescript
{ href: "/outages", labelKey: "common.outages" }
{ href: "https://example.com", labelKey: "footer.links.example", external: true }
{ href: "/config", labelKey: "common.config", adminOnly: true }
```

`labelKey` is resolved through `useI18n().t` at render time. `adminOnly` links
are filtered out for non-admin operators by `visibleFooterGroups`, which mirrors
`visibleNavLinks` in the navigation bar — the two surfaces cannot drift.