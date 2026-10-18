# App Shell Footer

> Issues #820–#823 — the footer was untyped English copy with no validation and
> a derivation pass that ran on every session heartbeat. This document is the
> reference for the components in `src/components/layout/`.

## Components

| File | Purpose |
|------|---------|
| `src/components/layout/Footer.tsx` | The footer |
| `src/components/layout/footer-types.ts` | Strict types (#820) |
| `src/components/layout/footer-derive.ts` | Memoized catalogue derivation (#823) |
| `src/components/layout/footer-validation.ts` | Email validation (#822) |
| `src/components/layout/FooterSubscribeForm.tsx` | Status-updates form (#822) |
| `src/i18n/messages/footer.ts` | Footer message catalogue (#821) |

The footer is mounted once, in `src/app/layout.tsx`, directly after `<main>`.

## TypeScript strict typing (#820)

The footer used `string` for everything that is actually a closed set — the
network, a link's destination kind, the operator's audience — so `"mainnetn"`
or a typo in a `role` compiled fine and only failed at runtime, as a badge in
the wrong colour or a column that never appeared.

### Destinations are a discriminated union

```typescript
export type FooterDestination =
  | { kind: "internal"; href: `/${string}`; labelKey: string; adminOnly?: boolean }
  | { kind: "external"; href: `http${string}` | `https${string}`; labelKey: string; external: true };
```

An optional `external: boolean` flag cannot stop `target="_blank"` ending up on a
router link, or a relative URL reaching an `href` without a scheme — the two
variants are indistinguishable to the checker. With a union the renderer is
**total**: the external branch is only reachable when `href` is an absolute URL,
and the template-literal types (`/${string}`, `https${string}`) make a malformed
destination a compile error.

### Validated values are branded

```typescript
export type ValidatedEmail = string & { readonly __brand: "ValidatedEmail" };
```

The brand is a compile-time fiction with no runtime cost. `validateEmail` is the
only thing that can produce one, so the submit handler physically cannot receive
an address that was never checked.

### Closed sets

`StellarNetworkName` (`"mainnet" | "testnet"`) and `FooterAudience`
(`"admin" | "operator"`) replace bare booleans and `string`s, so call sites read
as `buildFooterSummary(sections, isAdmin)` rather than
`buildFooterSummary(sections, true)` and widening the model later is a type error
at every site.

The project's `tsconfig.json` already runs `strict`, `noUncheckedIndexedAccess`
and `exactOptionalPropertyTypes`; these types are written to be sound under all
three.

## i18n translations (#821)

The footer's copy was hardcoded English inside the component, so the entire
footer was unreadable to the Spanish- and Portuguese-speaking operators the app
already ships locales for. Nothing in the footer went through `t()`.

### Why the catalogue lives in `src/i18n/messages/footer.ts`

The locale bundles in `src/i18n/messages/*.json` are **corrupt in this
checkout** — binary blobs, not JSON, since commit `a9de073`. They cannot be
parsed, edited or imported, which is why every existing test in this repo mocks
`@/i18n/i18n` rather than using the real provider.

Rather than leave the footer untranslatable, its copy lives in a well-formed,
typed catalogue that `I18nProvider` merges into every locale. `t("footer.tagline")`
therefore resolves exactly like any other key, and `footer.ts` becomes redundant
the moment the bundles are restored.

### Keys are nested, not dotted

`t()` takes a dotted path, so the catalogue is authored nested and flattened at
the point of use:

```typescript
const flat = flattenFooterMessages(FOOTER_MESSAGES.en);
flat["footer.subscribe.invalid"]; // "That does not look like a valid email address."
```

Keeping it nested in source is what lets `Record<Locale, FooterMessages>` enforce
**at compile time** that all three locales define exactly the same keys. A
missing `pt` translation is a type error, not a runtime surprise.

## Form validation (#822)

The status-updates form had no validation at all: an empty or malformed address
was posted straight to the API, the operator saw a generic failure toast, and
the reason was never surfaced inline. They had no way to tell a typo in their
address from a broken subscription service.

Validation is now client-side and inline, next to the field:

- **Empty is `required`, not `invalid`** — the operator is told what is missing,
  not that what they typed is malformed.
- The regex rejects the mistakes people actually make (missing `@`, trailing
  dot, missing TLD, spaces) and **nothing stricter**, so it never rejects an
  address that would actually have worked. The address is verified by the
  confirmation email it triggers.
- The error clears **as soon as the operator edits the field**, rather than
  making them submit again to find out they fixed it.
- A **service failure is not a validation failure**: the typed address survives
  so the operator can retry, and the field stays valid.
- `aria-invalid` and `aria-describedby` are wired to the message; the submit
  button reflects the in-flight state and is disabled while submitting.

`validateEmail` returns a discriminated union, so the failure branch cannot be
forgotten:

```typescript
const result = validateEmail(value);
if (!result.ok) { setErrorCode(result.code); return; }
await onSubscribe(result.value); // typed as ValidatedEmail
```

## Memoized derivations (#823)

Everything the footer derives from its catalogue used to be recomputed inline on
every render: filtering admin-only links, flattening to a single list,
accumulating counts, and walking the list to work out each column's offset. The
footer is inside the session provider, so this ran on every heartbeat and every
query invalidation — several array allocations and multiple passes over the
catalogue, a few times a minute, for a result that only changes when the
catalogue or the audience does.

`buildFooterSummary` is now a **single pure pass** producing all of it:

```typescript
interface FooterSummary {
  sections: readonly FooterSection[];
  totalLinks: number;
  sectionCount: number;
  isEmpty: boolean;
  sectionOffsets: readonly number[];  // global offset of each section's first link
}
```

Two details that matter:

- **The memo is keyed on `[isAdmin, sections]` — not on the session object.**
  `useSession` returns a fresh object reference on every heartbeat, so depending
  on it would redo the whole derivation for an identical result.
- **`sectionOffsets` accumulates only for sections that survive the filter**, so
  the offsets always describe the rendered DOM rather than the input catalogue.

Sections left with no visible destinations are dropped rather than rendered as a
bare heading — a heading with nothing under it reads as a rendering bug.

## Tests

`tests/footer-i18n-validation.test.tsx` covers all four issues. Unlike the other
footer suites it drives the **real** `I18nProvider`, because proving that the
footer is genuinely translated in all three locales is the whole point of #821.

It asserts, among other things, that all three locales define an identical key
set, that the copy genuinely differs per locale, that no `footer.*` key is
reported missing, and that the derived link count is 10 for an admin and 8 for
an operator.

## Adding a footer link

Links are plain typed data in `FOOTER_SECTIONS` in `Footer.tsx`:

```typescript
{ kind: "internal", href: "/outages", labelKey: "common.outages" }
{ kind: "internal", href: "/config", labelKey: "common.config", adminOnly: true }
{ kind: "external", href: "https://example.com", labelKey: "footer.links.example", external: true }
```

`labelKey` is resolved through `useI18n().t` at render time. `adminOnly` links
are filtered out for non-admin operators, mirroring `visibleNavLinks` in the
navigation bar — the two surfaces cannot drift.

New user-facing strings belong in **all three** locales in
`src/i18n/messages/footer.ts`; the `Record<Locale, FooterMessages>` type will
fail to compile if one is missing.