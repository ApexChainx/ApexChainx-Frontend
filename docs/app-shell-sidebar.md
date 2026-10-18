# App Shell Sidebar

> Issues #828–#831 — the sidebar had no test coverage, re-rendered on every
> session heartbeat, and forced a keyboard user to Tab through every destination.
> This document is the reference for the components in
> `src/components/layout/`.

## Components

| File | Purpose |
|------|---------|
| `src/components/layout/Sidebar.tsx` | The sidebar (Issues #830, #831) |
| `src/components/layout/SidebarLinkGroup.tsx` | One collapsible section |
| `src/components/layout/sidebar-items.ts` | Grouping, flattening, key resolver |

The sidebar is mounted once, in `src/app/layout.tsx`, beside `<main>`.

Destinations come from `NAV_LINKS` in `src/components/shell/nav-links.ts` — the
same single source of truth the top navigation bar uses, so the two surfaces
cannot drift.

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

### A note on the test doubles

The **session mock is backed by a real React context**, not a plain function.
That is deliberate: a plain function mock would let `React.memo` swallow a
session change entirely, hiding the very bug the re-render work is about.
Modelling it as a context is what exercises the real behaviour.

Memoization is asserted with **DOM node identity** (`toBe(sameNode)`) rather than
render counters — counters are brittle to unrelated implementation changes,
whereas a replaced element is exactly what `memo` failing looks like.

The i18n provider is mocked and `t` echoes the key — the
`src/i18n/messages/*.json` bundles are corrupt in this checkout (binary since
commit `a9de073`), so the test runner cannot import them.

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