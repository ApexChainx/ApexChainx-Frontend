# App Shell Footer

> Issues #816–#819 — the footer had no analytics, no empty state, no dark-mode
> colours of its own, and was a monolith nothing could reuse. This document is
> the reference for the components in `src/components/layout/`.

## Components

| File | Purpose |
|------|---------|
| `src/components/layout/Footer.tsx` | The default composition for the site shell |
| `src/components/layout/FooterBrand.tsx` | Brand block (reusable) |
| `src/components/layout/FooterLinkSection.tsx` | One link column (reusable, analytics-wired) |
| `src/components/layout/FooterEmptyState.tsx` | Empty state (reusable) |
| `src/components/layout/footer-sections.ts` | Section catalogue, types, admin filtering |
| `src/lib/footer-analytics.ts` | Event names, `trackFooterEvent`, the swappable sink |

The footer is mounted once, in `src/app/layout.tsx`, directly after `<main>`.

## Reusable extraction (#819)

The footer used to be a monolith: brand block, link columns, legal line and
analytics wiring were all inlined into one component. Nothing could be reused
from it — an about page, an error screen or an embed could not borrow the link
columns without copying the markup, and the copy diverged on every reuse.

Everything the footer renders is now a separate exported component taking plain
props and knowing nothing about routes, sessions or copy decisions. The footer
is the *default composition* of those pieces, not the only place they exist.

```typescript
// Reuse a single piece anywhere:
import { FooterLinkSection } from "@/components/layout/FooterLinkSection";
import { FooterEmptyState } from "@/components/layout/FooterEmptyState";
import { FooterBrand } from "@/components/layout/FooterBrand";

// Or compose your own footer from the default catalogue:
import Footer from "@/components/layout/Footer";
<Footer sections={mySections} year={2026} />
```

`Footer` accepts `sections`, `emptyState`, `year` and `trackEvents`, so a caller
can supply a different catalogue, a different empty state, or suppress
analytics (an embed, a test).

> There is deliberately **no `footer/` barrel directory**. A directory named
> `footer` alongside `Footer.tsx` makes the module specifier ambiguous on a
> case-insensitive filesystem (macOS, Windows). The pieces are re-exported from
> `Footer.tsx` instead, which is unambiguous everywhere.

## Analytics events (#816)

The app had no first-party analytics, so there was no way to answer "which
footer links do operators actually use?" — and guessing from server logs misses
client-side navigation entirely, because an in-app route change never reaches
the access log.

`src/lib/footer-analytics.ts` is dependency-free and emits four events:

| Event | When |
|-------|------|
| `footer.view` | Once per mount (guarded by a ref, so not once per render) |
| `footer.link_click` | An operator activates a link |
| `footer.empty_state` | The footer rendered with nothing to show |
| `footer.group_expand` | Reserved for a collapsible column |

### Wiring a real sink

```typescript
import { setAnalyticsSink } from "@/lib/footer-analytics";

setAnalyticsSink((event, properties) => {
  navigator.sendBeacon("/api/analytics", JSON.stringify({ event, properties }));
});
```

Until a sink is registered, events still go to a **Sentry breadcrumb** — the
project's existing reporting channel — so a support ticket reads as "clicked
Payments, then Settings, then hit the failure".

### Rules the module enforces

- **Never throws.** Analytics must not be able to break the surface it is
  measuring; a failing sink is swallowed after being logged.
- **No network call.** A sink plugs in behind `setAnalyticsSink`; no call site
  changes.
- **External URLs are not recorded as routes.** `sanitiseHref` strips query
  strings and fragments and drops absolute URLs entirely, so operator-identifying
  query strings can never leak into an event payload.
- **Events are a closed set.** `FOOTER_EVENTS` is `as const` and the properties
  type is deliberately narrow, which keeps the payload cheap to reason about.

## Empty state (#817)

When every link is filtered out, the footer used to render a bare heading with
nothing under it — which reads as a rendering bug rather than as "there is
nothing here yet".

`FooterEmptyState` renders an explicit, designed state instead: a polite
`role="status"` region that says what is missing and points at where it gets
configured. The link grid is removed entirely rather than rendered empty, and
the brand and legal rows still render around it — an empty catalogue is a
content state, not a broken component.

`visibleFooterSections` also **drops sections left empty by admin filtering**, so
a non-admin operator never sees a heading with nothing under it — they see the
empty state.

## Dark mode (#818)

The footer sits on the app's main surface, where a light-only palette fails:

- The footer surface declares `dark:bg-slate-900` / `dark:border-slate-700`
  explicitly rather than relying on inherited tokens, so it stays legible
  whichever surface it is embedded in.
- **Links declare per-scheme colours.** The app-wide default link blue drops
  below the WCAG AA 4.5:1 contrast ratio on the dark surface, so footer links
  use `text-slate-700` / `dark:text-slate-300` and a scheme-aware focus ring.
- The network badge uses `dark:` variants of its fill — amber for mainnet
  ("handle with care"), emerald for testnet ("safe to test against"). Both stay
  above 3:1 against the light and dark footer surfaces.
- The empty state, brand block and legal row all carry `dark:` variants.

Run `npm run check:contrast` after changing any of these colours.

## Tests

`tests/footer-analytics-darkmode.test.tsx` covers all four issues: event
emission and de-duplication, href scrubbing, sink failure isolation, the
Sentry breadcrumb path, the empty state and its admin-filtering interaction, the
dark-mode class contract, and reuse of each piece outside the shell.

The i18n provider is mocked (`t` echoes the key) — the `src/i18n/messages/*.json`
bundles are corrupt in this checkout (binary since commit `a9de073`), so the
test runner cannot import them.

## Adding a footer link

Links are plain data in `src/components/layout/footer-sections.ts`:

```typescript
{ href: "/outages", labelKey: "common.outages" }
{ href: "https://example.com", labelKey: "footer.links.example", external: true }
{ href: "/config", labelKey: "common.config", adminOnly: true }
```

`labelKey` is resolved through `useI18n().t` at render time. `adminOnly` links
are filtered out for non-admin operators by `visibleFooterSections`, which
mirrors `visibleNavLinks` in the navigation bar — the two surfaces cannot drift.