# App Shell Sidebar

> Issues #824–#827 — the sidebar was a fixed-width column at every viewport, had
> no accessibility affordances beyond colour, reserved no space while the
> session resolved, and could take the whole application down. This document is
> the reference for the components in `src/components/layout/`.

## Components

| File | Purpose |
|------|---------|
| `src/components/layout/Sidebar.tsx` | The sidebar (Issues #824, #825) |
| `src/components/layout/SidebarSkeleton.tsx` | Loading placeholder (Issue #826) |
| `src/components/layout/SidebarErrorBoundary.tsx` | Failure containment (Issue #827) |

The sidebar is mounted once, in `src/app/layout.tsx`, beside `<main>` and inside
`<SidebarErrorBoundary>`.

## Responsive layout (#824)

The sidebar was a fixed 256px column at every width. Below `lg` it squeezed the
page content into an unusable sliver, and on a 320px phone it pushed the main
region off-screen entirely.

It is now a responsive region with two layouts, switched on `matchMedia`:

| Viewport | Layout | Toggle |
|----------|--------|--------|
| `< 1024px` | Off-canvas drawer (`w-72 max-w-[85vw]`) | Yes |
| `>= 1024px` | Static column (`w-64 shrink-0`), in flow | No |

Four details make the drawer behave:

- **The route-change effect skips its first run.** Without that guard it would
  close the drawer on mount and make `defaultOpen` a no-op. A route change *after*
  mount still closes it, so an operator on a phone who taps a link is never left
  staring at the previous page's navigation behind an opaque panel.
- **The drawer scrolls independently.** The link list is `flex-1 min-h-0
  overflow-y-auto`, so a long catalogue can never grow past a short viewport.
- **Growing past the breakpoint clears drawer state.** Once the sidebar becomes
  a static column, leftover `isOpen` would keep it translated off-canvas.
- **No toggle is rendered in the static layout** — a desktop keyboard user is not
  offered a control that does nothing.

The transition is disabled under `prefers-reduced-motion`.

## Accessibility (#825)

- The sidebar is a **`navigation` landmark labelled `navigation.secondary`**,
  keeping it distinguishable from the top bar's `navigation.primary`.
- The current route is marked with **`aria-current="page"`, not colour alone** —
  otherwise a colour-blind or high-contrast user has no way to tell where they
  are.
- The toggle is a real `<button>` carrying **`aria-expanded` and `aria-controls`**
  pointing at the drawer's id, and its label changes between open and close.
- The open drawer is a **`role="dialog"` with `aria-modal`**, and focus is
  trapped inside it via the existing `useFocusTrap` hook, landing on the close
  button.
- **Escape always closes the drawer**, so it is never trapped shut.
- The overlay is **`aria-hidden`** — the drawer already carries `aria-modal`, so
  exposing the backdrop would add a second, meaningless thing to announce.
- Decorative glyphs (☰, ✕) are `aria-hidden`; every icon-only control has an
  accessible name.
- Every interactive element has **both a visible focus ring and a 44px minimum
  touch target**.

### Hydration

`useIsDesktop` starts at `false` so the server render and the first client render
agree. Rendering a column on one and a drawer on the other is a hydration
mismatch; the effect corrects it before the sidebar becomes interactive.

## Loading skeleton (#826)

The sidebar is derived from the session, so on a cold load it rendered nothing:
the page settled at full width, then the sidebar appeared and shoved every
element across by its own width — a visible jump on every navigation.

`SidebarSkeleton` reserves the sidebar's **exact box** (same `w-64 shrink-0
lg:flex border-r` contract as the real sidebar) using the shared `Skeleton`
primitive, and is a polite `role="status"` with `aria-busy="true"`. The live
region is declared once on the `<aside>`; the individual bars are `aria-hidden`
so they are not announced.

## Error boundary (#827)

The sidebar is composed from session state, the route and the translated link
catalogue. Any of those can throw while still resolving.

Without a boundary such a throw unwound the whole React tree and replaced the
entire application with the route-level error screen — **an operator lost the
dashboard they were working in because a navigation link failed to render.**
Navigation is the least valuable thing on the page and must never be able to
take the page down with it.

On failure the sidebar collapses to a compact, localized placeholder that
**keeps its width**, so the page content does not shift, with a retry button
focused on mount. The rest of the shell stays mounted and interactive.

This mirrors `MetricErrorBoundary` for dashboard tiles: shell-level regions that
compose session or translation state get their own boundary.

## Tests

`tests/sidebar-responsive-a11y.test.tsx` covers all four issues. `matchMedia` is
stubbed per-test so the sidebar can be driven at both breakpoints, and
`usePathname` is backed by a mutable route so the route-change close is
exercised for real rather than by remounting.

The i18n provider is mocked (`t` echoes the key) — the `src/i18n/messages/*.json`
bundles are corrupt in this checkout (binary since commit `a9de073`), so the test
runner cannot import them.

## Adding a sidebar destination

The sidebar reuses `visibleNavLinks` and `NAV_LINKS` from
`src/components/shell/nav-links.ts` — the same single source of truth the top
navigation bar uses, so the two surfaces cannot drift.

```typescript
{ href: "/outages", labelKey: "common.outages", tour: "nav-outages" }
{ href: "/config", labelKey: "common.config", adminOnly: true }
```

`adminOnly` destinations are filtered out for non-admin operators. `tour` attaches
the `data-tour` hook used by the onboarding tour.