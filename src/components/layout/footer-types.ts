/** ApexChain Network Operations Intelligence Platform */
/**
 * Strict types for the footer (Issue #820).
 *
 * The footer was written with `string` for everything that is actually a closed
 * set — the network, a link's destination kind, the operator's role — so
 * `"mainnetn"` or a typo in a `role` was accepted by the compiler and only
 * failed at runtime, as a badge in the wrong colour or a column that never
 * appeared.
 *
 * These types close the sets at compile time. Nothing here is erased at
 * runtime, and every export is a real `type`/`interface` a caller can rely on.
 */

/**
 * A value that has been proven to satisfy a constraint and therefore needs no
 * further checking. The brand is a compile-time fiction — it does not exist at
 * runtime — so a validated address cannot be passed where a raw string is
 * expected, and vice versa.
 */
type Brand<T, B extends string> = T & { readonly __brand: B };

/**
 * An email address that has passed {@link validateEmail}.
 *
 * Constructing one requires going through the validator, which is the point:
 * the submit handler cannot receive a value that was never checked.
 */
export type ValidatedEmail = Brand<string, "ValidatedEmail">;

/** The Stellar network the deployment is configured against. */
export type StellarNetworkName = "mainnet" | "testnet";

/**
 * How a footer link behaves when activated.
 *
 * Modelled as a **discriminated union** rather than an optional `external`
 * boolean, because the two variants carry genuinely different data: an
 * internal destination is a route the app owns, an external one is an absolute
 * URL that must carry `rel="noopener noreferrer"`. With a boolean flag, an
 * internal-looking route and an external URL are indistinguishable to the type
 * checker, which is exactly how `target="_blank"` ends up on a router link or a
 * relative URL ends up in an `href` without a scheme.
 */
export type FooterDestination =
  | {
      readonly kind: "internal";
      /** Route path, always starting with `/`. */
      readonly href: `/${string}`;
      /** i18n key resolved at render time. */
      readonly labelKey: string;
      /** Rendered only for admin operators. */
      readonly adminOnly?: boolean;
    }
  | {
      readonly kind: "external";
      /** Absolute URL, including its scheme. */
      readonly href: `http${string}` | `https${string}`;
      readonly labelKey: string;
      /** Always true on this variant; present so rendering code can be total. */
      readonly external: true;
    };

/** A titled column of footer destinations. */
export interface FooterSection {
  /** Stable id; also used as the analytics `groupId`. */
  readonly id: string;
  /** i18n key for the column heading. */
  readonly titleKey: string;
  readonly links: readonly FooterDestination[];
}

/**
 * Which operator the footer is rendering for.
 *
 * Used instead of a bare `boolean` so call sites read as
 * `visibleFooterSections(operator)` rather than `visibleFooterSections(true)`,
 * and so widening the model later (a `guest` role, say) is a type error at
 * every site rather than a silent behaviour change.
 */
export type FooterAudience = "admin" | "operator";

/**
 * Derived, memoized facts about the rendered footer (Issue #823).
 *
 * Computed once per catalogue change rather than on every render — see
 * `useFooterSummary`.
 */
export interface FooterSummary {
  readonly sections: readonly FooterSection[];
  readonly totalLinks: number;
  readonly sectionCount: number;
  readonly isEmpty: boolean;
  /**
   * Global offset of each section's first link in DOM order. Lets a column
   * number its links without re-flattening the catalogue.
   */
  readonly sectionOffsets: readonly number[];
}