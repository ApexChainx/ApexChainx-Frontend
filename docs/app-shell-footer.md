# App Shell Footer

> Issues #812–#815 — the site-wide footer had no test coverage, re-rendered on
> every session heartbeat, and forced a keyboard user to Tab through every link.
> This document is the reference for the components in
> `src/components/layout/`.

## Components

| File | Purpose |
|------|---------|
| `src/components/layout/Footer.tsx` | The footer (Issues #814, #815) |
| `src/components/layout/footer-links.ts` | Link catalogue, admin filtering, key resolver |

The footer is mounted once, in `src/app/layout.tsx`, directly after `<main>`.

## Re-render optimisation (Issue #814)

The footer sits outside `<main>` but **inside** the session and i18n providers,
so it was re-rendered by every session heartbeat, every React Query
invalidation and every toast in the app — around forty elements re-diffed
several times a minute for output that almost never changes.

Three changes fix it:

1. **`memo` on every presentational piece** — `FooterBrand`, `FooterLinkColumn`
   and `FooterLinkItem` are separate memoized components, so a prop-identical
   render is skipped outright rather than re-diffed.
2. **The catalogue is module-level data** and the admin-filtered view is
   `useMemo`'d on **`[isAdmin]` alone**. Depending on the session object would
   recompute it several times a minute for an identical result, because
   `useSession` returns a fresh object reference on every heartbeat.
3. **`memo` on the exported default**, so an unrelated parent re-render never
   cascades into the footer subtree at all.

> `memo` only short-circuits *prop*-equal renders. A **context** update still
> propagates through it, which is why a role change still correctly adds or
> removes the admin-only column — `useSession` reads the provider in
> `src/providers/session.tsx`, not props.

## Keyboard navigation (Issue #815)

The footer is a long run of links — twelve or more on a desktop layout. A
keyboard user had to press Tab for every single one to reach the next section.

The link region now implements the **WAI-ARIA roving-tabindex** pattern:

- Exactly one link is in the tab order (`tabIndex={0}`); the rest are
  `tabIndex={-1}`. The whole footer is a **single tab stop**.
- <kbd>→</kbd> / <kbd>↓</kbd> move to the next link, <kbd>←</kbd> / <kbd>↑</kbd>
  to the previous one, and **both axes wrap** so a keyboard user never
  dead-ends at the boundary.
- <kbd>Home</kbd> / <kbd>End</kbd> jump to the ends.
- **Tab is never hijacked**, so focus always leaves the footer normally. The
  footer cannot trap focus.
- The arrow keys are only handled when focus is actually inside the region; from
  anywhere else the browser keeps its normal behaviour.

`tabIndex={-1}` removes a link from *sequential* focus only — every link stays
in the accessibility tree and is reachable with the arrow keys.

### Why one delegated handler

A single `onKeyDown` on the wrapping `<nav>` handles every link, instead of one
listener per link. The listener count therefore does not grow with the link
catalogue, and `nextFooterLinkIndex` — a pure function — can be unit-tested
without rendering anything.

```typescript
nextFooterLinkIndex(currentIndex, key, total)
// → next index, or null for "not handled" (Tab, Enter, letters…)
```

## Tests

| File | Level | Covers |
|------|-------|--------|
| `tests/footer.test.tsx` | Unit (#812) | Catalogue invariants, admin filtering, `nextFooterLinkIndex`, each piece rendered in isolation |
| `tests/footer-integration.test.tsx` | Integration (#813) | Keyboard navigation end to end, re-render counts under session churn, composition inside the shell |

### A note on the test doubles

The i18n message bundles in `src/i18n/messages/` are corrupt in this checkout
(binary since commit `a9de073`), so the provider is mocked and `t` echoes the
key — the existing convention across this repo's tests.

The **session mock is backed by a real React context**, not a plain function.
That is deliberate: a plain function mock would let `React.memo` swallow a
session change entirely, hiding the very bug the re-render work is about.
Modelling it as a context is what exercises the real behaviour.

## Adding a footer link

Links are plain data in `src/components/layout/footer-links.ts`:

```typescript
{ href: "/outages", labelKey: "common.outages" }
{ href: "https://example.com", labelKey: "footer.links.example", external: true }
{ href: "/config", labelKey: "common.config", adminOnly: true }
```

`labelKey` is resolved through `useI18n().t` at render time. `adminOnly` links
are filtered out for non-admin operators by `visibleFooterGroups`, which mirrors
`visibleNavLinks` in the navigation bar — the two surfaces cannot drift.

New links are picked up by the keyboard handler automatically: the region is
queried by the `data-footer-link` attribute rather than by a fixed count, and
the tab order is derived from DOM order.