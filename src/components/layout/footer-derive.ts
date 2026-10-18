/** ApexChain Network Operations Intelligence Platform */
/**
 * Footer link-catalogue derivation (Issue #823 — memoize expensive computations).
 *
 * Everything the footer derives from its catalogue used to be recomputed inline
 * on every render: filtering admin-only links, flattening to a single list for
 * the keyboard handler, accumulating counts, and walking the list to work out
 * each column's offset. The footer sits inside the session provider, so this
 * ran on every heartbeat and every query invalidation — several array
 * allocations and multiple passes over the catalogue, a few times a minute,
 * for a result that only changes when the catalogue or the audience does.
 *
 * `buildFooterSummary` is the single pure pass that produces all of it.
 */

import type {
  FooterSection,
  FooterSummary,
} from "@/components/layout/footer-types";

/**
 * Minimal structural input, so the caller may pass its own readonly catalogue
 * without widening it to the full `FooterSection` type first.
 */
export interface FooterSectionLike {
  readonly id: string;
  readonly titleKey: string;
  readonly links: readonly {
    readonly href: string;
    readonly labelKey: string;
    readonly adminOnly?: boolean;
  }[];
}

/**
 * Derive everything the footer renders from a catalogue and an audience, in one
 * pass.
 *
 * Sections left with no visible destinations are dropped rather than rendered as
 * a bare heading — a heading with nothing under it reads as a rendering bug.
 */
export function buildFooterSummary(
  sections: readonly FooterSectionLike[],
  isAdmin: boolean,
): FooterSummary {
  const visible: FooterSection[] = [];
  const sectionOffsets: number[] = [];
  let totalLinks = 0;

  for (const section of sections) {
    const links = section.links.filter(
      (link) => !("adminOnly" in link) || link.adminOnly !== true || isAdmin,
    );
    if (links.length === 0) continue;

    // Offsets accumulate only for sections that survive the filter, so they
    // always describe the rendered DOM rather than the input catalogue.
    sectionOffsets.push(totalLinks);
    totalLinks += links.length;
    visible.push({ id: section.id, titleKey: section.titleKey, links });
  }

  return {
    sections: visible,
    totalLinks,
    sectionCount: visible.length,
    isEmpty: visible.length === 0,
    sectionOffsets,
  };
}

/** Flatten the visible sections into DOM order — the keyboard handler's list. */
export function flattenFooterLinks(
  summary: FooterSummary,
): FooterSection["links"][number][] {
  return summary.sections.flatMap((section) => [...section.links]);
}

export type { FooterSection, FooterSummary };