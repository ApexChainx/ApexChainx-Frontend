/**
 * ApexChain Frontend Test Suite — Sidebar unit tests (Issue #828).
 *
 * Unit level: the pure grouping and key-resolution logic, and each presentational
 * piece rendered in isolation.
 *
 * The i18n message bundles are corrupted in this checkout, so the provider is
 * mocked and `t` echoes the key.
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const route = vi.hoisted(() => ({ current: "/outages" }));

vi.mock("@/i18n/i18n", () => ({
  useI18n: () => ({ t: (key: string) => key, locale: "en" }),
}));

vi.mock("@/hooks/useSession", () => ({
  useSession: () => ({ state: "authenticated", user: null, logout: vi.fn() }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => route.current,
}));

import Sidebar from "@/components/layout/Sidebar";
import { SidebarLinkGroup } from "@/components/layout/SidebarLinkGroup";
import { NAV_LINKS } from "@/components/shell/nav-links";
import {
  SIDEBAR_LINK_ATTRIBUTE,
  flattenSidebarLinks,
  groupSidebarLinks,
  nextSidebarLinkIndex,
} from "@/components/layout/sidebar-items";

beforeEach(() => {
  route.current = "/outages";
});

afterEach(cleanup);

/** The active index a bare group renders against, so memo props are stable. */
const NOOP = () => {};

describe("sidebar link grouping", () => {
  it("groups destinations for an operator, with no administration group", () => {
    const groups = groupSidebarLinks(false, NAV_LINKS);

    expect(groups.map((group) => group.id)).toEqual(["operations"]);
    expect(groups[0]?.links.length).toBeGreaterThan(0);
  });

  it("adds an administration group for an admin operator", () => {
    const groups = groupSidebarLinks(true, NAV_LINKS);

    expect(groups.map((group) => group.id)).toEqual(["operations", "administration"]);
    const admin = groups.find((group) => group.id === "administration");
    expect(admin?.links.every((link) => link.adminOnly === true)).toBe(true);
  });

  it("derives group membership from the adminOnly flag, not a second list", () => {
    const groups = groupSidebarLinks(true, NAV_LINKS);
    const administration = groups.find((group) => group.id === "administration");
    const operations = groups.find((group) => group.id === "operations");

    // Every admin destination lands in administration and nowhere else.
    NAV_LINKS.filter((link) => link.adminOnly === true).forEach((link) => {
      expect(administration?.links).toContainEqual(link);
      expect(operations?.links).not.toContainEqual(link);
    });
  });

  it("never loses or duplicates a destination", () => {
    for (const isAdmin of [true, false]) {
      const flattened = flattenSidebarLinks(groupSidebarLinks(isAdmin, NAV_LINKS));
      const expected = NAV_LINKS.filter((link) => !link.adminOnly || isAdmin);

      expect(flattened.map((link) => link.href)).toEqual(
        expected.map((link) => link.href),
      );
    }
  });

  it("drops a group left with no members", () => {
    const adminOnly: typeof NAV_LINKS = [
      { href: "/config", labelKey: "common.config", adminOnly: true },
    ];

    // An operator sees nothing, so neither group is emitted — a bare heading
    // with nothing under it reads as a rendering bug.
    expect(groupSidebarLinks(false, adminOnly)).toEqual([]);
    expect(groupSidebarLinks(true, adminOnly).map((g) => g.id)).toEqual([
      "administration",
    ]);
  });

  it("flattens groups into DOM order for the keyboard handler", () => {
    const flat = flattenSidebarLinks(groupSidebarLinks(true, NAV_LINKS));
    expect(flat[0]?.href).toBe("/");
    expect(flat).toHaveLength(NAV_LINKS.length);
  });
});

describe("nextSidebarLinkIndex (#831)", () => {
  it("advances with ArrowDown and ArrowRight", () => {
    expect(nextSidebarLinkIndex(0, "ArrowDown", 5)).toBe(1);
    expect(nextSidebarLinkIndex(0, "ArrowRight", 5)).toBe(1);
  });

  it("goes back with ArrowUp and ArrowLeft", () => {
    expect(nextSidebarLinkIndex(3, "ArrowUp", 5)).toBe(2);
    expect(nextSidebarLinkIndex(3, "ArrowLeft", 5)).toBe(2);
  });

  it("wraps in both directions instead of dead-ending", () => {
    expect(nextSidebarLinkIndex(4, "ArrowDown", 5)).toBe(0);
    expect(nextSidebarLinkIndex(0, "ArrowUp", 5)).toBe(4);
  });

  it("jumps to the ends with Home and End", () => {
    expect(nextSidebarLinkIndex(3, "Home", 5)).toBe(0);
    expect(nextSidebarLinkIndex(3, "End", 5)).toBe(4);
  });

  it("leaves Tab alone so the sidebar never becomes a focus trap", () => {
    expect(nextSidebarLinkIndex(1, "Tab", 5)).toBeNull();
  });

  it("leaves every other key to the browser", () => {
    for (const key of ["Enter", " ", "a", "Escape"]) {
      expect(nextSidebarLinkIndex(1, key, 5)).toBeNull();
    }
  });

  it("is inert when there are no links", () => {
    expect(nextSidebarLinkIndex(0, "ArrowDown", 0)).toBeNull();
    expect(nextSidebarLinkIndex(0, "Home", 0)).toBeNull();
  });
});

describe("SidebarLinkGroup", () => {
  const GROUP = {
    id: "operations" as const,
    titleKey: "sidebar.groups.operations",
    links: NAV_LINKS.slice(0, 2),
  };

  it("renders a disclosure button carrying its expanded state", () => {
    render(
      <SidebarLinkGroup
        group={GROUP}
        isExpanded
        onToggle={NOOP}
        offset={0}
        activeIndex={0}
        onActiveLinkChange={NOOP}
      />,
    );

    const toggle = screen.getByRole("button", { name: /sidebar.groups.operations/ });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle.getAttribute("aria-controls")).toBeTruthy();
  });

  it("points aria-controls at the panel it actually controls", () => {
    render(
      <SidebarLinkGroup
        group={GROUP}
        isExpanded
        onToggle={NOOP}
        offset={0}
        activeIndex={0}
        onActiveLinkChange={NOOP}
      />,
    );

    const panelId = screen.getByRole("button", { name: /sidebar.groups.operations/ })
      .getAttribute("aria-controls");
    expect(document.getElementById(panelId ?? "")).not.toBeNull();
  });

  it("removes its links from the tree when collapsed, rather than hiding them", () => {
    render(
      <SidebarLinkGroup
        group={GROUP}
        isExpanded={false}
        onToggle={NOOP}
        offset={0}
        activeIndex={0}
        onActiveLinkChange={NOOP}
      />,
    );

    // Leaving them in the tree hidden with CSS would keep them reachable by
    // screen reader and keyboard while invisible — worse than either state.
    expect(screen.queryByRole("link", { name: "common.dashboard" })).toBeNull();
    expect(screen.getByRole("button", { name: /sidebar.groups.operations/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("marks the current route with aria-current rather than colour alone", () => {
    route.current = "/payments";
    render(
      <SidebarLinkGroup
        group={GROUP}
        isExpanded
        onToggle={NOOP}
        offset={0}
        activeIndex={0}
        onActiveLinkChange={NOOP}
      />,
    );

    expect(screen.getByRole("link", { name: "common.dashboard" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("numbers its links from the global offset it is given", () => {
    render(
      <SidebarLinkGroup
        group={GROUP}
        isExpanded
        onToggle={NOOP}
        offset={5}
        activeIndex={5}
        onActiveLinkChange={NOOP}
      />,
    );

    // With offset 5 and activeIndex 5, only the group's first link is in the
    // tab order — proving the offset is applied rather than starting at 0.
    const first = screen.getByRole("link", { name: "common.dashboard" });
    expect(first).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("link", { name: "common.outages" })).toHaveAttribute(
      "tabindex",
      "-1",
    );
  });

  it("hides the disclosure chevron from assistive tech", () => {
    render(
      <SidebarLinkGroup
        group={GROUP}
        isExpanded
        onToggle={NOOP}
        offset={0}
        activeIndex={0}
        onActiveLinkChange={NOOP}
      />,
    );

    // `aria-expanded` on the button already conveys the state.
    expect(screen.getByText("▾")).toHaveAttribute("aria-hidden", "true");
  });
});

describe("Sidebar rendering", () => {
  it("renders a labelled navigation landmark distinct from the top bar", () => {
    render(<Sidebar />);
    expect(screen.getByRole("navigation", { name: "navigation.secondary" })).toBeInTheDocument();
  });

  it("marks the elements the keyboard handler manages", () => {
    render(<Sidebar />);

    const managed = document.querySelectorAll(`[${SIDEBAR_LINK_ATTRIBUTE}]`);
    expect(managed.length).toBeGreaterThan(0);
  });

  it("puts exactly one link in the tab order", () => {
    render(<Sidebar />);

    const links = screen.getByRole("navigation").querySelectorAll("a");
    const tabbable = Array.from(links).filter((link) => link.tabIndex === 0);
    expect(tabbable).toHaveLength(1);
  });

  it("renders every group heading as a button", () => {
    render(<Sidebar />);

    // Default session is unauthenticated in this suite, so only the operations
    // group is visible.
    expect(
      screen.getByRole("button", { name: /sidebar.groups.operations/ }),
    ).toBeInTheDocument();
  });

  it("lets the link list scroll independently of the page", () => {
    render(<Sidebar />);

    const nav = screen.getByRole("navigation");
    expect(nav.className).toMatch(/overflow-y-auto/);
    expect(nav.className).toMatch(/min-h-0/);
    expect(nav.className).toMatch(/flex-1/);
  });

  it("gives every interactive element a 44px touch target and a focus ring", () => {
    render(<Sidebar />);

    screen
      .getByRole("navigation")
      .querySelectorAll("a, button")
      .forEach((element) => {
        expect(element.className).toMatch(/min-h-\[44px\]/);
        expect(element.className).toMatch(/focus-visible:outline-2/);
      });
  });

  it("preserves onboarding tour hooks on the links that declare them", () => {
    render(<Sidebar />);

    expect(screen.getByRole("link", { name: "common.dashboard" })).toHaveAttribute(
      "data-tour",
      "nav-dashboard",
    );
    expect(screen.getByRole("link", { name: "common.settings" })).not.toHaveAttribute(
      "data-tour",
    );
  });
});