# App Shell Sidebar

> Issues #824–#831 — the sidebar was a fixed-width column at every viewport, had
> no accessibility affordances beyond colour, reserved no space while the
> session resolved, could take the whole application down, had no test coverage,
> re-rendered on every session heartbeat, and forced a keyboard user to Tab
> through every destination. This document is the reference for the components
> in `src/components/layout/`.

## Components

| File | Purpose |
|------|---------|
| `src/components/layout/Sidebar.tsx` | The sidebar (Issues #824, #825, #830, #831) |
| `src/components/layout/SidebarLinkGroup.tsx` | One collapsible section |
| `src/components/layout/sidebar-items.ts` | Grouping, flattening, key resolver |
| `src/components/layout/SidebarSkeleton.tsx` | Loading placeholder (Issue #826) |
| `src/components/layout/SidebarErrorBoundary.tsx` | Failure containment (Issue #827) |

The sidebar is mounted once, in `src/app/layout.tsx`, beside `<main>` and inside
`<SidebarErrorBoundary>`.

Destinations come from `NAV_LINKS` in `src/components/shell/nav-links.ts` — the
same single source of truth the top navigation bar uses, so the two surfaces
cannot drift.

## Responsive layout (#824)

The sidebar was a fixed 256px column at every width. Below `lg` it squeezed the
page content into an unusable sliver, and on a 320px phone it pushed the main
region off-screen entirely.

It is now a responsive region with two layouts, switched on `matchMedia`:

| Viewport | Layout | Toggle |
|----------|--------|--------|
| `< 1024px` | Off-canvas drawer (`w-72 max-w-[85vw]`) | Yes |
| `>= 1024px` | Static column (`w-64 shrink-0`), in flow | No |

Both layouts render the same grouped, keyboard-navigable link tree — only the
container around it changes.

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
mismatch; the effect corrects it before the sidebar becomes interactive. If the
browser has no `matchMedia` at all the sidebar settles on the static column —
the one layout that can never hide navigation behind a control.

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

## Re-render optimisation (#830)

The sidebar sits inside the session provider, so it was re-rendered by every
session heartbeat and every React Query invalidation: the whole link tree
re-diffed several times a minute for output that almost never changes.

Three changes fix it:

1. **Grouping is a pure function** (`groupSidebarLinks`) and the result is
   `useMemo`'d on **`[isAdmin]` alone**. Depending on the session object would
   regroup the whole tree several times a minute for an identical result,
   because `useSession` returns a fresh reference on every heartbeat.
2. **`SidebarLinkGroup` is memoized on its own props**, so collapsing one group
   — or moving the roving tabindex onto a link in another — re-renders only the
   group that changed.
3. **The exported default is `memo`**, so an unrelated parent render never
   cascades in.

> `memo` only short-circuits *prop*-equal renders. A **context** update still
> propagates through it, which is why a role change still correctly adds or
> removes the administration group — `useSession` reads the provider in
> `src/providers/session.tsx`, not props.

### Callback identity matters

`onToggle` and `onActiveLinkChange` are wrapped in `useCallback`. A fresh
closure on every render would defeat every `memo` in the tree, because each
group's props would always differ.

The tests assert this with **DOM node identity** rather than render counters:
if a sibling group had re-rendered, React would have replaced its elements, so
`toBe(sameNode)` is a direct, deterministic check that `memo` held.

## Keyboard navigation (#831)

The sidebar is a long run of destinations, so a keyboard user had to press Tab
for every one to reach the next section.

### Roving tabindex on the links

- Exactly one link is in the tab order (`tabIndex={0}`); the rest are
  `tabIndex={-1}`. The whole list is a **single tab stop**.
- <kbd>↓</kbd>/<kbd>→</kbd> move to the next link, <kbd>↑</kbd>/<kbd>←</kbd> to the
  previous, and **both axes wrap** so a keyboard user never dead-ends.
- <kbd>Home</kbd>/<kbd>End</kbd> jump to the ends.
- <kbd>Tab</kbd> is **never handled** — hijacking it would make the sidebar a
  focus trap. The resolver returns `null` for it explicitly, and there is a test
  asserting this.

The arrow keys are only handled when focus is actually inside the list; from
anywhere else the browser keeps its normal behaviour.

### Group disclosure

Each section heading is a real `<button>` with `aria-expanded`/`aria-controls`,
operable with <kbd>Enter</kbd> or <kbd>Space</kbd>. When a group is collapsed its
links are **removed from the tree entirely** rather than hidden with CSS —
leaving them in would keep them reachable by screen reader and keyboard while
being invisible, which is worse than either state on its own.

The active index is clamped on every render, so collapsing a group out from
under it still leaves exactly one valid tab stop.

### One delegated handler

A single `onKeyDown` on the wrapping `<nav>` covers every link rather than one
listener per link, so the listener count does not grow with the destination
count, and key resolution lives in the pure, unit-tested `nextSidebarLinkIndex`.

## Grouping

Group membership is derived from the `adminOnly` flag on `NAV_LINKS` rather than
hardcoded, so adding an admin route puts it in the right group without a second
edit. A group left with no members is dropped rather than rendered as a bare
heading.

```typescript
groupSidebarLinks(isAdmin) // → [{ id: "operations", … }, { id: "administration", … }]
```

## Tests

| File | Level | Covers |
|------|-------|--------|
| `tests/sidebar.test.tsx` | Unit (#828) | Grouping invariants, `nextSidebarLinkIndex`, `SidebarLinkGroup` in isolation, landmarks and touch targets |
| `tests/sidebar-integration.test.tsx` | Integration (#829) | Keyboard navigation end to end, disclosure cycles, memoization, composition beside real page content |
| `tests/sidebar-responsive-a11y.test.tsx` | Behaviour (#824, #825, #826, #827) | Both layouts at both breakpoints, drawer dismissal, skeleton, error boundary |

`matchMedia` is stubbed per-test so the sidebar can be driven at both
breakpoints, and `usePathname` is backed by a mutable route so the route-change
close is exercised for real rather than by remounting.

### A note on the test doubles

The **session mock is backed by a real React context**, not a plain function.
That is deliberate: a plain function mock would let `React.memo` swallow a
session change entirely, hiding the very bug the re-render work is about.
Modelling it as a context is what exercises the real behaviour.

Memoization is asserted with **DOM node identity** (`toBe(sameNode)`) rather than
render counters — counters are brittle to unrelated implementation changes,
whereas a replaced element is exactly what `memo` failing looks like.

The i18n provider is mocked (`t` echoes the key) so these suites do not depend on
the message bundles.

## Adding a sidebar destination

Add it to `NAV_LINKS` in `src/components/shell/nav-links.ts`:

```typescript
{ href: "/outages", labelKey: "common.outages", tour: "nav-outages" }
{ href: "/config", labelKey: "common.config", adminOnly: true }
```

`adminOnly` destinations move into the administration group and are hidden from
non-admin operators. `tour` attaches the `data-tour` hook used by the onboarding
tour. Nothing else needs to change — the sidebar picks it up automatically,
including its position in the roving tab order.
