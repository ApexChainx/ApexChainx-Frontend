/** ApexChain Network Operations Intelligence Platform */
/**
 * Sidebar link grouping and keyboard key resolution (Issues #830, #831).
 *
 * Pure functions only — no React — so the sidebar's structure and its keyboard
 * behaviour can be reasoned about and unit-tested without rendering anything.
 */

import { visibleNavLinks, type NavLinkItem } from "@/components/shell/nav-links";

/**
 * Stable identifier for a sidebar section. Reusing `NAV_LINKS`'s `adminOnly`
 * flag to decide membership means the sidebar and the top navigation bar can
 * never disagree about which destinations exist for whom.
 */
export type SidebarGroupId = "operations" | "administration";

/** A titled, collapsible run of sidebar destinations. */
export interface SidebarGroup {
  readonly id: SidebarGroupId;
  /** i18n key for the group heading, resolved at render time. */
  readonly titleKey: string;
  readonly links: readonly NavLinkItem[];
}

/**
 * Destinations that belong to the administration group.
 *
 * Deliberately derived from the `adminOnly` flag rather than hardcoded, so
 * adding an admin route to `NAV_LINKS` puts it in the right group without a
 * second edit here.
 */
function isAdministrationLink(link: NavLinkItem): boolean {
  return link.adminOnly === true;
}

/**
 * Group the visible links into collapsible sections.
 *
 * A group left with no members is dropped rather than rendered as a bare
 * heading — an empty heading reads as a rendering bug to an operator.
 */
export function groupSidebarLinks(
  isAdmin: boolean,
  links: readonly NavLinkItem[] = [],
): SidebarGroup[] {
  const visible = visibleNavLinks(isAdmin, links.length > 0 ? links : NAV_LINKS);

  const operations = visible.filter((link) => !isAdministrationLink(link));
  const administration = visible.filter(isAdministrationLink);

  const groups: SidebarGroup[] = [];
  if (operations.length > 0) {
    groups.push({ id: "operations", titleKey: "sidebar.groups.operations", links: operations });
  }
  if (administration.length > 0) {
    groups.push({
      id: "administration",
      titleKey: "sidebar.groups.administration",
      links: administration,
    });
  }
  return groups;
}

/** Flatten the groups into the DOM-order list the keyboard handler walks. */
export function flattenSidebarLinks(groups: readonly SidebarGroup[]): NavLinkItem[] {
  return groups.flatMap((group) => [...group.links]);
}

/** Marks the elements the roving-tabindex handler manages. */
export const SIDEBAR_LINK_ATTRIBUTE = "data-sidebar-link";

/**
 * Resolve the next focused index for a keyboard interaction.
 *
 * Implements the WAI-ARIA roving-tabindex pattern: the arrow keys move between
 * links, `Home`/`End` jump to the ends, and both axes wrap so a keyboard user
 * never dead-ends. Returns `null` for "not handled" — the caller must leave the
 * event alone so `Tab`, Enter and typing still behave natively.
 *
 * `Tab` is deliberately **not** handled: hijacking it would make the sidebar a
 * focus trap.
 */
export function nextSidebarLinkIndex(
  currentIndex: number,
  key: string,
  total: number,
): number | null {
  if (total === 0) return null;

  switch (key) {
    case "ArrowDown":
    case "ArrowRight":
      return (currentIndex + 1) % total;
    case "ArrowUp":
    case "ArrowLeft":
      return (currentIndex - 1 + total) % total;
    case "Home":
      return 0;
    case "End":
      return total - 1;
    default:
      return null;
  }
}